import { collectMercadoLibre } from "@/lib/collectors/mercadolibre";
import { collectTrends } from "@/lib/collectors/trends";
import { generateNarrative } from "@/lib/report/generate";
import { computeScore, deriveVerdict } from "@/lib/scoring/engine";
import type {
  AnalyzeInput,
  MercadoLibreData,
  Report,
  Signal,
  TrendsData,
} from "@/lib/types";

// Orquestador del flujo A: validar un producto para Argentina.
// collect (paralelo) -> score -> narrativa (LLM) -> reporte. Determinista salvo el LLM.

const EMPTY_ML: MercadoLibreData = {
  available: false,
  totalListings: null,
  priceMin: null,
  priceMax: null,
  priceMedian: null,
  currency: null,
  topSellers: [],
  sampleTitles: [],
  note: "Collector no ejecutado.",
};

const EMPTY_TRENDS: TrendsData = {
  available: false,
  ar: { direction: "desconocido", points: [] },
  us: { direction: "desconocido", points: [] },
  note: "Collector no ejecutado.",
};

export async function runAnalysis(input: AnalyzeInput): Promise<Report> {
  // 1. Recolección en paralelo (cada collector degrada con gracia).
  const [mlResult, trendsResult] = await Promise.all([
    collectMercadoLibre(input.query),
    collectTrends(input.query),
  ]);

  const ml = (mlResult.raw?.mercadoLibre as MercadoLibreData) ?? EMPTY_ML;
  const trends = (trendsResult.raw?.trends as TrendsData) ?? EMPTY_TRENDS;

  const signals: Signal[] = [...mlResult.signals, ...trendsResult.signals];

  // 2. Scoring explicable.
  const score = computeScore(ml, trends, input);
  const { verdict, confidence } = deriveVerdict(score);

  // 3. Narrativa con el LLM (grounded en la evidencia).
  const narrative = await generateNarrative({
    input,
    ml,
    trends,
    score,
    verdict,
  });

  // 4. Nota de cobertura honesta.
  const missing: string[] = [];
  if (!ml.available) missing.push("Mercado Libre");
  if (!trends.available) missing.push("Google Trends");
  const dataCoverageNote =
    missing.length === 0
      ? "Fuentes consultadas: Mercado Libre y Google Trends. Anuncios activos (Meta/TikTok) llegan en fase 2."
      : `Cobertura parcial. Fuentes no disponibles en esta corrida: ${missing.join(
          ", ",
        )}. La confianza del análisis está ajustada a la baja en consecuencia. Anuncios activos (Meta/TikTok) llegan en fase 2.`;

  return {
    input,
    createdAt: new Date().toISOString(),
    signals,
    mercadoLibre: ml,
    trends,
    score,
    narrative,
    recommendation: {
      verdict,
      confidence,
      rationale: narrative.justificacionRecomendacion,
    },
    sources: [mlResult.source, trendsResult.source],
    dataCoverageNote,
  };
}
