import { searchMarketplace } from "@/lib/collectors/apify";
import { collectMercadoLibre } from "@/lib/collectors/mercadolibre";
import { collectMetaAds } from "@/lib/collectors/meta-ads";
import { collectTrends } from "@/lib/collectors/trends";
import { getUserCredential, getUserOrPlatformCredential } from "@/lib/credentials/store";
import { generateNarrative } from "@/lib/report/generate";
import { computeScore, deriveVerdict } from "@/lib/scoring/engine";
import type {
  AnalysisEvidence,
  AnalyzeInput,
  Marketplace,
  MarketplaceSearchResult,
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
  ar: { direction: "desconocido", points: [], labels: [] },
  us: { direction: "desconocido", points: [], labels: [] },
  note: "Collector no ejecutado.",
};

const EMPTY_META_ADS: MetaAdsData = {
  available: false,
  ar: null,
  us: null,
  searchTermsUsed: "",
  note: "Collector no ejecutado.",
};

// Marketplaces globales que entran al reporte como `globalMarketplaces`
// (evidencia + señal de competencia/margen). "mercadolibre" NO está acá: se
// usa aparte, solo para recuperar precio (ver mergeMlPrice más abajo).
const GLOBAL_MARKETPLACES: Marketplace[] = ["amazon", "aliexpress", "alibaba"];

/** Min/max/mediana a partir de los items con precio real de un resultado de Apify. */
function priceStats(items: MarketplaceSearchResult["items"]): { min: number; max: number; median: number; currency: string | null } | null {
  const prices = items.map((i) => i.price).filter((p): p is number => typeof p === "number" && p > 0);
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return { min: sorted[0], max: sorted[sorted.length - 1], median, currency: items.find((i) => i.currency)?.currency ?? null };
}

/**
 * Completa priceMin/Max/Median/currency de un MercadoLibreData (que la API
 * oficial de catálogo deja en null, ver collectors/mercadolibre.ts) con el
 * resultado de un scraping de precio vía Apify. No pisa totalListings/
 * sampleTitles/note, que sí vienen de la API oficial.
 */
function mergeMlPrice(ml: MercadoLibreData, priceResult: MarketplaceSearchResult): MercadoLibreData {
  if (!priceResult.available) return ml;
  const stats = priceStats(priceResult.items);
  if (!stats) return ml;
  return {
    ...ml,
    priceMin: stats.min,
    priceMax: stats.max,
    priceMedian: stats.median,
    currency: stats.currency ?? ml.currency,
  };
}

export async function gatherEvidence(
  input: AnalyzeInput,
  opts?: { clerkUserId?: string },
): Promise<AnalysisEvidence> {
  // Meta Ad Library es BYOK (credential por usuario, ver src/lib/credentials/).
  // Sin usuario o sin credential cargado, el collector degrada con gracia.
  // Mercado Libre: ML dejó de aceptar búsquedas anónimas (403 sin token). La
  // búsqueda es de datos PÚBLICOS del marketplace (no de la cuenta conectada,
  // a diferencia de mercadolibre_seller_snapshot) — el token ahí es solo un
  // requisito de autenticación, así que cualquier cuenta de ML sirve para
  // cualquier usuario. Por eso, si el usuario no conectó la suya, caemos al
  // credential "de plataforma" (PLATFORM_CREDENTIALS_CLERK_USER_ID) antes de
  // degradar — evita que cada usuario tenga que conectar su propia cuenta
  // solo para tener resultados de Mercado Libre.
  // Apify (Amazon/AliExpress/Alibaba + precio de ML) es server-side
  // (APIFY_API_TOKEN), NO es BYOK — searchMarketplace degrada con gracia
  // por sí solo si falta el token o el actor (no hace falta credential acá).
  const [metaAdsCredential, mlSellerCredential] = await Promise.all([
    opts?.clerkUserId ? getUserCredential(opts.clerkUserId, "meta_ads") : null,
    getUserOrPlatformCredential(opts?.clerkUserId, "mercadolibre_seller"),
  ]);

  // 1. Recolección en paralelo (cada collector degrada con gracia).
  //    input.market es el mercado LOCAL; US se usa siempre como referencia.
  const [mlResult, trendsResult, metaAdsResult, mlPriceResult, ...globalMarketplaceResults] = await Promise.all([
    collectMercadoLibre(input.query, input.market, mlSellerCredential?.accessToken),
    collectTrends(input.query, input.market, input.dateFrom, input.dateTo),
    collectMetaAds(
      input.query,
      metaAdsCredential?.accessToken,
      input.market,
      input.dateFrom,
      input.dateTo,
    ),
    searchMarketplace("mercadolibre", input.query, undefined, input.market),
    ...GLOBAL_MARKETPLACES.map((marketplace) => searchMarketplace(marketplace, input.query)),
  ]);

  const ml = mergeMlPrice((mlResult.raw?.mercadoLibre as MercadoLibreData) ?? EMPTY_ML, mlPriceResult);
  const trends = (trendsResult.raw?.trends as TrendsData) ?? EMPTY_TRENDS;
  const metaAds = (metaAdsResult.raw?.metaAds as MetaAdsData) ?? EMPTY_META_ADS;
  const globalMarketplaces = globalMarketplaceResults;

  const signals: Signal[] = [...mlResult.signals, ...trendsResult.signals, ...metaAdsResult.signals];

  // 2. Scoring explicable (determinista, sin LLM).
  const score = computeScore(ml, trends, metaAds, input, globalMarketplaces);
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
    globalMarketplaces,
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
    globalMarketplaces: evidence.globalMarketplaces,
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
    globalMarketplaces: evidence.globalMarketplaces,
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
