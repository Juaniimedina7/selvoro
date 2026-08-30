// Modelo de dominio de Selvoro (slice 1: validación de producto para Argentina).
// Mantiene la trazabilidad Signal -> Score -> Recommendation -> Report del plan.

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
  /** Mercado objetivo. En el MVP fijo en AR. */
  market: "AR";
  /** Ticket deseado en USD (opcional, mejora el análisis de margen). */
  ticketUsd?: number;
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

/** Datos de tendencia (Google Trends), AR vs US. */
export interface TrendsData {
  available: boolean;
  ar: { direction: "subiendo" | "estable" | "bajando" | "desconocido"; points: number[] };
  us: { direction: "subiendo" | "estable" | "bajando" | "desconocido"; points: number[] };
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

/** Datos de Meta Ad Library, AR vs US (mismo patrón dual que TrendsData). */
export interface MetaAdsData {
  available: boolean;
  ar: MetaAdsMarketData | null;
  us: MetaAdsMarketData | null;
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
  score: ScoreResult;
  narrative: ReportNarrative;
  recommendation: Recommendation;
  sources: string[];
  /** Nota sobre cobertura/limitaciones de datos de esta corrida. */
  dataCoverageNote: string;
}
