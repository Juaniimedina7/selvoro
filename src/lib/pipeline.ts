import { collectMercadoLibre } from "@/lib/collectors/mercadolibre";
import { collectMetaAds } from "@/lib/collectors/meta-ads";
import { collectTrends } from "@/lib/collectors/trends";
import { getUserCredential } from "@/lib/credentials/store";
import { generateNarrative } from "@/lib/report/generate";
import { computeScore, deriveVerdict } from "@/lib/scoring/engine";
import type {
  AnalysisEvidence,
  AnalyzeInput,
  MercadoLibreData,
  MetaAdsData,
  Report,
  Signal,
  TrendsData,
} from "@/lib/types";

// Orquestador del flujo A: validar un producto para Argentina.
// gatherEvidence: collect (paralelo) -> score. Sin LLM, barato y rápido.
// runAnalysis: gatherEvidence + narrativa (LLM). Lo usa el formulario web
// (/api/analyze), que necesita el texto redactado porque no hay ningún otro
// LLM río abajo. Las tools del agente (chat/MCP) usan gatherEvidence
// directamente: el LLM que llama (nuestro chat o el cliente MCP externo) ya
// puede sintetizar su propia narrativa a partir de la evidencia + el
// `evidence` textual que cada dimensión del scoring ya trae (determinista,
// sin costo de LLM) — no hace falta pagar una llamada nuestra por cada tool call.

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

const EMPTY_META_ADS: MetaAdsData = {
  available: false,
  ar: null,
  us: null,
  searchTermsUsed: "",
  note: "Collector no ejecutado.",
};

export async function gatherEvidence(
  input: AnalyzeInput,
  opts?: { clerkUserId?: string },
): Promise<AnalysisEvidence> {
  // Meta Ad Library es BYOK (credential por usuario, ver src/lib/credentials/).
  // Sin usuario o sin credential cargado, el collector degrada con gracia.
  const metaAdsCredential = opts?.clerkUserId
    ? await getUserCredential(opts.clerkUserId, "meta_ads")
    : null;

  // 1. Recolección en paralelo (cada collector degrada con gracia).
  const [mlResult, trendsResult, metaAdsResult] = await Promise.all([
    collectMercadoLibre(input.query),
    collectTrends(input.query),
    collectMetaAds(input.query, metaAdsCredential?.accessToken),
  ]);

  const ml = (mlResult.raw?.mercadoLibre as MercadoLibreData) ?? EMPTY_ML;
  const trends = (trendsResult.raw?.trends as TrendsData) ?? EMPTY_TRENDS;
  const metaAds = (metaAdsResult.raw?.metaAds as MetaAdsData) ?? EMPTY_META_ADS;

  const signals: Signal[] = [...mlResult.signals, ...trendsResult.signals, ...metaAdsResult.signals];

  // 2. Scoring explicable (determinista, sin LLM).
  const score = computeScore(ml, trends, metaAds, input);
  const { verdict, confidence } = deriveVerdict(score);

  // 3. Nota de cobertura honesta.
  const missing: string[] = [];
  if (!ml.available) missing.push("Mercado Libre");
  if (!trends.available) missing.push("Google Trends");
  if (!metaAds.available) missing.push("Meta Ad Library");
  const dataCoverageNote =
    missing.length === 0
      ? "Fuentes consultadas: Mercado Libre, Google Trends y Meta Ad Library (AR/US). TikTok Creative Center queda para una fase futura (sin API oficial)."
      : `Cobertura parcial. Fuentes no disponibles en esta corrida: ${missing.join(
          ", ",
        )}. La confianza del análisis está ajustada a la baja en consecuencia. TikTok Creative Center queda para una fase futura (sin API oficial).`;

  return {
    input,
    createdAt: new Date().toISOString(),
    signals,
    mercadoLibre: ml,
    trends,
    metaAds,
    score,
    verdict,
    confidence,
    sources: [mlResult.source, trendsResult.source, metaAdsResult.source],
    dataCoverageNote,
  };
}

export async function runAnalysis(
  input: AnalyzeInput,
  opts?: { clerkUserId?: string },
): Promise<Report> {
  const evidence = await gatherEvidence(input, opts);

  const narrative = await generateNarrative({
    input: evidence.input,
    ml: evidence.mercadoLibre,
    trends: evidence.trends,
    metaAds: evidence.metaAds,
    score: evidence.score,
    verdict: evidence.verdict,
  });

  return {
    input: evidence.input,
    createdAt: evidence.createdAt,
    signals: evidence.signals,
    mercadoLibre: evidence.mercadoLibre,
    trends: evidence.trends,
    metaAds: evidence.metaAds,
    score: evidence.score,
    narrative,
    recommendation: {
      verdict: evidence.verdict,
      confidence: evidence.confidence,
      rationale: narrative.justificacionRecomendacion,
    },
    sources: evidence.sources,
    dataCoverageNote: evidence.dataCoverageNote,
  };
}
