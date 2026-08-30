import { getLlm } from "@/lib/llm/client";
import type { Report, TestBrief } from "@/lib/types";

// generate_test_brief: 2da llamada LLM grounded en un Report YA guardado
// (su narrativa, señales de Meta Ads, y el scoring). Mismas reglas
// anti-alucinación que report/generate.ts: nunca prometer ROAS/CPA/ventas
// reales, presupuesto siempre en banda (no monto exacto) salvo que el usuario
// haya dado un ticketUsd de referencia.

const SYSTEM = `Sos "Selvoro", redactando un brief de testeo publicitario a partir de un análisis ya hecho.

REGLAS ESTRICTAS (iguales a las del análisis original):
- Trabajás SOLO con la evidencia del reporte que te paso. No inventes datos nuevos.
- PROHIBIDO prometer ROAS, CPA, ventas o conversión reales.
- El presupuesto inicial va SIEMPRE en banda (bajo/medio/alto), nunca como monto exacto, salvo que uses el ticketUsd de referencia para dar contexto (nunca un número de inversión).
- Los ángulos y hooks deben basarse en las señales positivas, diferenciadores y (si existen) los creative snippets de Meta Ads del reporte — no en frases genéricas de marketing.
- Español rioplatense, accionable, sin relleno.`;

const SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    angulos: { type: "array", items: { type: "string" }, description: "3-5 ángulos de comunicación concretos." },
    hooks: { type: "array", items: { type: "string" }, description: "3-5 hooks/aperturas de creatividad." },
    publicoObjetivo: { type: "array", items: { type: "string" }, description: "Segmentos de público a probar." },
    ofertaSugerida: { type: "string" },
    presupuestoInicialBanda: { type: "string", enum: ["bajo", "medio", "alto"] },
    planSemana1: { type: "array", items: { type: "string" }, description: "Pasos concretos para la primera semana de testeo." },
    advertencia: { type: "string", description: "Un párrafo corto recordando los límites de confianza del análisis base." },
  },
  required: [
    "angulos",
    "hooks",
    "publicoObjetivo",
    "ofertaSugerida",
    "presupuestoInicialBanda",
    "planSemana1",
    "advertencia",
  ],
};

export async function generateTestBrief(report: Report): Promise<TestBrief> {
  const evidence = {
    producto: report.input.query,
    ticketObjetivoUsd: report.input.ticketUsd ?? null,
    veredicto: report.recommendation.verdict,
    confianza: report.recommendation.confidence,
    resumenEjecutivo: report.narrative.resumenEjecutivo,
    senalesPositivas: report.narrative.senalesPositivas,
    diferenciadores: report.narrative.diferenciadores,
    ideasDeTesteoPrevias: report.narrative.ideasDeTesteo,
    creativeSnippetsMeta: [
      ...(report.metaAds.ar?.sampleAdSnippets ?? []),
      ...(report.metaAds.us?.sampleAdSnippets ?? []),
    ],
    scoringCompuesto: report.score.compositeBand,
  };

  const user = `Generá un brief de testeo publicitario para este producto, basado en un análisis ya hecho.

EVIDENCIA DEL REPORTE (JSON):
${JSON.stringify(evidence, null, 2)}

Devolvé el JSON pedido.`;

  return getLlm().generateJson<TestBrief>({ system: SYSTEM, user, schema: SCHEMA });
}
