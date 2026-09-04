// Modelo de dominio de Selvoro (slice 1: validación de producto para Argentina).
// Mantiene la trazabilidad Signal -> Score -> Recommendation -> Report del plan.

import type { CountryCode, NicheId } from "@/lib/taxonomy/niches";

export type Confidence = "alta" | "media" | "baja";

export type Verdict = "testear" | "investigar" | "descartar";

/** Dimensiones del scoring explicable (ver plan §9). */
export type ScoreDimension =
  | "demanda"
  | "competencia"
  | "saturacion_local"
  | "persistencia_publicitaria"
  | "oportunidad_local"
  | "margen_potencial"
  | "logistica"
  | "diferenciacion"
  | "riesgo";

/** Input del usuario para el flujo A (validar un producto). */
export interface AnalyzeInput {
  /** Nombre o descripción del producto, o una URL (AliExpress/tienda). */
  query: string;
  /** Mercado local objetivo (home). US se usa siempre como referencia para el gap. */
  market: CountryCode;
  /** Ticket deseado en USD (opcional, mejora el análisis de margen). */
  ticketUsd?: number;
  /** Nicho (opcional): da contexto al análisis y a la búsqueda. */
  nicheId?: NicheId;
  /** Rango de fechas (ISO YYYY-MM-DD) para anuncios activos / tendencia. */
  dateFrom?: string;
  dateTo?: string;
}

/** Una señal observable con su fuente y confianza (nunca una métrica de ventas real). */
export interface Signal {
  key: string;
  label: string;
  value: string | number | null;
  source: string;
  confidence: Confidence;
  /** true si la fuente no pudo consultarse (degradación con gracia). */
  unavailable?: boolean;
}

/** Resultado crudo de un collector de datos. */
export interface CollectorResult {
  source: string;
  signals: Signal[];
  /** Datos estructurados adicionales que el LLM puede usar para redactar. */
  raw?: Record<string, unknown>;
  error?: string;
}

/** Estadística de precios de Mercado Libre. */
export interface MercadoLibreData {
  available: boolean;
  totalListings: number | null;
  priceMin: number | null;
  priceMax: number | null;
  priceMedian: number | null;
  currency: string | null;
  topSellers: { nickname: string; soldSignal: string | null }[];
  sampleTitles: string[];
  note?: string;
}

/** Marketplaces externos consultables vía Apify (collectors/apify.ts). */
export type Marketplace = "amazon" | "aliexpress" | "alibaba" | "mercadolibre";

export interface MarketplaceSearchItem {
  title: string;
  url?: string;
  price?: number;
  currency?: string;
  rating?: number;
  reviewsCount?: number;
  imageUrl?: string;
}

/**
 * Resultado de una búsqueda en un marketplace externo (Amazon/AliExpress/
 * Alibaba) vía Apify. "mercadolibre" acá es un uso interno (recuperar precio
 * cuando la API oficial no lo expone, ver pipeline.ts) — no aparece como
 * entrada de `globalMarketplaces` en el reporte.
 */
export interface MarketplaceSearchResult {
  available: boolean;
  marketplace: Marketplace;
  query: string;
  items: MarketplaceSearchItem[];
  note?: string;
}

/** Datos de tendencia (Google Trends): mercado local (ar) vs referencia US (us). */
export interface TrendsData {
  available: boolean;
  /** Slot "local": corresponde a `homeCountry` (AR por defecto). */
  ar: { direction: "subiendo" | "estable" | "bajando" | "desconocido"; points: number[] };
  /** Slot "referencia": siempre US. */
  us: { direction: "subiendo" | "estable" | "bajando" | "desconocido"; points: number[] };
  /** País local real del slot `ar` (default AR). */
  homeCountry?: CountryCode;
  note?: string;
}

/** Anuncios activos detectados en Meta Ad Library para un mercado puntual. */
export interface MetaAdsMarketData {
  activeAdsCount: number | null;
  /** true si activeAdsCount llegó al límite de la página (100): es un piso, no el total real. */
  truncated: boolean;
  uniqueAdvertisers: number | null;
  avgActiveDays: number | null;
  maxActiveDays: number | null;
  topAdvertisers: { pageName: string; activeDays: number | null }[];
  /** Fragmentos de copy de anuncios reales, solo para que el LLM sugiera ángulos. Nunca se usan en el scoring. */
  sampleAdSnippets: string[];
}

/** Datos de Meta Ad Library: mercado local (ar) vs referencia US (us). */
export interface MetaAdsData {
  available: boolean;
  /** Slot "local": corresponde a `homeCountry` (AR por defecto). */
  ar: MetaAdsMarketData | null;
  /** Slot "referencia": siempre US. */
  us: MetaAdsMarketData | null;
  /** País local real del slot `ar` (default AR). */
  homeCountry?: CountryCode;
  searchTermsUsed: string;
  note?: string;
}

/** Subpuntaje explicable de una dimensión. */
export interface DimensionScore {
  dimension: ScoreDimension;
  label: string;
  band: "alta" | "media" | "baja";
  /** 0-100, presentado en bandas para evitar falsa precisión. */
  value: number;
  weight: number;
  confidence: Confidence;
  evidence: string;
}

export interface ScoreResult {
  dimensions: DimensionScore[];
  /** Puntaje compuesto 0-100 (referencia interna, se muestra como banda). */
  composite: number;
  compositeBand: "alta" | "media" | "baja";
  globalConfidence: Confidence;
  /**
   * Margen bruto estimado cuando hay costo de origen (Alibaba/AliExpress,
   * vía Apify) y ticketUsd — mismo cálculo que ya arma evalMargen() en
   * scoring/engine.ts, expuesto acá como dato estructurado en vez de solo
   * texto en DimensionScore.evidence. null cuando no hay ambos datos.
   * SIN flete/aduana/comisiones — margen bruto, no rentabilidad neta.
   */
  marginBreakdown?: {
    costBasisUsd: number;
    ticketUsd: number;
    grossMarginUsd: number;
    grossMarginPct: number;
  } | null;
}

/** Secciones narrativas generadas por el LLM sobre la evidencia recolectada. */
export interface ReportNarrative {
  resumenEjecutivo: string;
  senalesPositivas: string[];
  senalesNegativas: string[];
  riesgos: string[];
  diferenciadores: string[];
  ideasDeTesteo: string[];
  justificacionRecomendacion: string;
}

export interface Recommendation {
  verdict: Verdict;
  confidence: Confidence;
  rationale: string;
}

/** Brief de testeo publicitario generado a partir de un Report ya guardado (tool generate_test_brief). */
export interface TestBrief {
  angulos: string[];
  hooks: string[];
  publicoObjetivo: string[];
  ofertaSugerida: string;
  presupuestoInicialBanda: "bajo" | "medio" | "alto";
  planSemana1: string[];
  advertencia: string;
}

/**
 * Evidencia cruda de un análisis: collectors + scoring, SIN narrativa LLM.
 * La usan las tools del agente (chat/MCP) — el LLM que llama ya puede
 * sintetizar su propia narrativa a partir de esto (incluye el `evidence`
 * textual determinista de cada dimensión del score), sin que nosotros
 * paguemos una llamada a Claude por cada tool call.
 */
export interface AnalysisEvidence {
  input: AnalyzeInput;
  createdAt: string;
  signals: Signal[];
  mercadoLibre: MercadoLibreData;
  trends: TrendsData;
  metaAds: MetaAdsData;
  /**
   * Búsquedas en marketplaces globales (Amazon/AliExpress/Alibaba) vía
   * Apify, BYOK y opcional — nunca cuenta contra dataCoverageNote/confianza
   * cuando está vacío (mismo criterio que BuiltWith/Tienda Nube).
   */
  globalMarketplaces: MarketplaceSearchResult[];
  score: ScoreResult;
  verdict: Verdict;
  confidence: Confidence;
  sources: string[];
  dataCoverageNote: string;
}

/** Reporte final que consume la web (y en fase 2, el MCP). */
export interface Report {
  input: AnalyzeInput;
  createdAt: string;
  signals: Signal[];
  mercadoLibre: MercadoLibreData;
  trends: TrendsData;
  metaAds: MetaAdsData;
  globalMarketplaces: MarketplaceSearchResult[];
  score: ScoreResult;
  narrative: ReportNarrative;
  recommendation: Recommendation;
  sources: string[];
  /** Nota sobre cobertura/limitaciones de datos de esta corrida. */
  dataCoverageNote: string;
}
