import { getLlm } from "@/lib/llm/client";
import type {
  AnalyzeInput,
  MarketplaceSearchResult,
  MercadoLibreData,
  MetaAdsData,
  ReportNarrative,
  ScoreResult,
  TrendsData,
} from "@/lib/types";

// Genera las secciones narrativas del reporte. El LLM SOLO sintetiza sobre la
// evidencia recolectada; tiene prohibido inventar métricas de ventas/ROAS reales
// (plan §restricción de métricas y §13: alucinaciones).

const SYSTEM = `Sos "Selvoro", un analista de inteligencia de mercado para e-commerce enfocado en Argentina/LATAM.
Tu tarea es redactar las secciones cualitativas de un reporte de validación de producto.

REGLAS ESTRICTAS:
- Trabajás SOLO con la evidencia (señales/proxies) que te paso. No inventes datos.
- Está PROHIBIDO afirmar métricas privadas como ROAS, CPA, ventas exactas, facturación o rentabilidad real. No existen públicamente.
- Cuando una señal falte o tenga baja confianza, decilo explícitamente ("dato no disponible", "baja confianza").
- Diferenciá hechos observados de hipótesis. Marcá los supuestos.
- Escribí en español rioplatense, claro y accionable. Sin relleno.
- No repitas literalmente los números; interpretalos para la decisión de testear/investigar/descartar.
- El scoring que te paso es una ESTIMACIÓN explicable, no una métrica de ventas. Tratalo así.
- La antigüedad y cantidad de anuncios activos en Meta Ad Library es un proxy de que el anunciante sostiene el testeo, NUNCA una medida de ROAS, CPA, gasto publicitario o conversión real.
- Si Meta Ad Library no devolvió anuncios activos (0 en AR y US), no lo redactes como "sin competencia confirmada": es ambiguo (puede ser el término de búsqueda, no falta real de anunciantes). Decilo con esa cautela.`;

const SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    resumenEjecutivo: {
      type: "string",
      description: "3-5 líneas. La conclusión primero, con la señal más fuerte a favor y en contra.",
    },
    senalesPositivas: { type: "array", items: { type: "string" } },
    senalesNegativas: { type: "array", items: { type: "string" } },
    riesgos: { type: "array", items: { type: "string" } },
    diferenciadores: {
      type: "array",
      items: { type: "string" },
      description: "Ángulos u oportunidades no explotadas para el mercado AR.",
    },
    ideasDeTesteo: {
      type: "array",
      items: { type: "string" },
      description: "Hipótesis concretas de ángulo/público/oferta para un primer test.",
    },
    justificacionRecomendacion: {
      type: "string",
      description: "Por qué la recomendación (testear/investigar/descartar) tiene sentido dada la evidencia y su confianza.",
    },
  },
  required: [
    "resumenEjecutivo",
    "senalesPositivas",
    "senalesNegativas",
    "riesgos",
    "diferenciadores",
    "ideasDeTesteo",
    "justificacionRecomendacion",
  ],
};

export async function generateNarrative(params: {
  input: AnalyzeInput;
  ml: MercadoLibreData;
  trends: TrendsData;
  metaAds: MetaAdsData;
  globalMarketplaces: MarketplaceSearchResult[];
  score: ScoreResult;
  verdict: string;
}): Promise<ReportNarrative> {
  const { input, ml, trends, metaAds, globalMarketplaces, score, verdict } = params;

  const evidence = {
    producto: input.query,
    mercado: input.market,
    ticketObjetivoUsd: input.ticketUsd ?? null,
    mercadoLibre: ml,
    tendencias: trends,
    anunciosMeta: metaAds,
    // BYOK/opcional (Apify) — casi siempre []. Cuando hay datos, son precios
    // de referencia global (Amazon/AliExpress/Alibaba), NUNCA ventas/ROAS.
    marketplacesGlobales: globalMarketplaces,
    scoring: {
      compuesto: score.composite,
      banda: score.compositeBand,
      confianzaGlobal: score.globalConfidence,
      dimensiones: score.dimensions.map((d) => ({
        dimension: d.label,
        banda: d.band,
        confianza: d.confidence,
        evidencia: d.evidence,
      })),
    },
    recomendacionPreliminar: verdict,
  };

  const user = `Analizá este producto para el mercado argentino y redactá las secciones del reporte.

EVIDENCIA RECOLECTADA (JSON):
${JSON.stringify(evidence, null, 2)}

Recordá: la recomendación preliminar derivada del scoring es "${verdict}". Si la evidencia es débil o de baja confianza, decilo y no sobrevendas. Devolvé el JSON pedido.`;

  return getLlm().generateJson<ReportNarrative>({
    system: SYSTEM,
    user,
    schema: SCHEMA,
  });
}
