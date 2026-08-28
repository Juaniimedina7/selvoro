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

/** Reporte final que consume la web (y en fase 2, el MCP). */
export interface Report {
  input: AnalyzeInput;
  createdAt: string;
  signals: Signal[];
  mercadoLibre: MercadoLibreData;
  trends: TrendsData;
  score: ScoreResult;
  narrative: ReportNarrative;
  recommendation: Recommendation;
  sources: string[];
  /** Nota sobre cobertura/limitaciones de datos de esta corrida. */
  dataCoverageNote: string;
}
