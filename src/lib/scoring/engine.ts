import type {
  AnalyzeInput,
  Confidence,
  DimensionScore,
  MercadoLibreData,
  ScoreDimension,
  ScoreResult,
  TrendsData,
} from "@/lib/types";

// Motor de scoring explicable (plan §9). Reglas transparentes sobre señales/proxies.
// NUNCA presenta un puntaje como métrica de ventas real: bandas + evidencia + confianza.

const WEIGHTS: Record<ScoreDimension, number> = {
  demanda: 0.15,
  competencia: 0.15,
  saturacion_local: 0.2,
  persistencia_publicitaria: 0.15,
  oportunidad_local: 0.1,
  margen_potencial: 0.1,
  logistica: 0.05,
  diferenciacion: 0.05,
  riesgo: 0.05,
};

const LABELS: Record<ScoreDimension, string> = {
  demanda: "Demanda",
  competencia: "Competencia",
  saturacion_local: "Saturación local (AR)",
  persistencia_publicitaria: "Persistencia publicitaria",
  oportunidad_local: "Oportunidad local (gap US↔AR)",
  margen_potencial: "Margen potencial",
  logistica: "Logística",
  diferenciacion: "Diferenciación",
  riesgo: "Riesgo",
};

function band(value: number): "alta" | "media" | "baja" {
  if (value >= 67) return "alta";
  if (value >= 34) return "media";
  return "baja";
}

interface Ctx {
  ml: MercadoLibreData;
  trends: TrendsData;
  input: AnalyzeInput;
}

type DimEval = { value: number; confidence: Confidence; evidence: string };

function evalDemanda({ trends, ml }: Ctx): DimEval {
  if (!trends.available && !ml.available) {
    return {
      value: 40,
      confidence: "baja",
      evidence: "Sin datos de tendencia ni de marketplace: demanda no verificable.",
    };
  }
  let score = 50;
  const parts: string[] = [];
  if (trends.available) {
    if (trends.ar.direction === "subiendo") {
      score += 25;
      parts.push("tendencia AR en alza");
    } else if (trends.ar.direction === "bajando") {
      score -= 20;
      parts.push("tendencia AR a la baja");
    } else {
      parts.push("tendencia AR estable");
    }
  }
  if (ml.available && ml.totalListings != null) {
    if (ml.totalListings > 50) {
      score += 15;
      parts.push(`${ml.totalListings} publicaciones en ML (hay mercado)`);
    } else if (ml.totalListings === 0) {
      score -= 10;
      parts.push("sin publicaciones en ML (¿nicho o inexistente?)");
    } else {
      parts.push(`${ml.totalListings} publicaciones en ML`);
    }
  }
  return {
    value: clamp(score),
    confidence: trends.available && ml.available ? "media" : "baja",
    evidence: parts.join("; ") || "Datos parciales.",
  };
}

function evalCompetencia({ ml }: Ctx): DimEval {
  if (!ml.available || ml.totalListings == null) {
    return {
      value: 50,
      confidence: "baja",
      evidence: "Sin datos de Mercado Libre: competencia local no verificable.",
    };
  }
  // Más competencia = peor para 'competencia' (score alto = poca competencia = oportunidad).
  const t = ml.totalListings;
  let score: number;
  let ev: string;
  if (t < 20) {
    score = 75;
    ev = `Solo ${t} publicaciones: competencia local baja.`;
  } else if (t < 100) {
    score = 50;
    ev = `${t} publicaciones: competencia local media.`;
  } else {
    score = 25;
    ev = `${t} publicaciones: competencia local alta.`;
  }
  return { value: score, confidence: "media", evidence: ev };
}

function evalSaturacion({ ml }: Ctx): DimEval {
  // Diferenciador clave (plan §9). Sin ads todavía, aproximamos con listings ML.
  if (!ml.available || ml.totalListings == null) {
    return {
      value: 50,
      confidence: "baja",
      evidence:
        "Saturación aproximada solo con marketplace y sin datos: baja confianza. Los anuncios activos (fase 2) mejorarán esta dimensión.",
    };
  }
  const t = ml.totalListings;
  let score: number;
  let ev: string;
  if (t < 30) {
    score = 70;
    ev = `${t} listings en AR: saturación estimada BAJA (proxy por marketplace).`;
  } else if (t < 150) {
    score = 45;
    ev = `${t} listings en AR: saturación estimada MEDIA (proxy por marketplace).`;
  } else {
    score = 20;
    ev = `${t} listings en AR: saturación estimada ALTA (proxy por marketplace).`;
  }
  return { value: score, confidence: "baja", evidence: ev };
}

function evalPersistencia(): DimEval {
  // Requiere datos de anuncios (antigüedad, variantes) que llegan en fase 2.
  return {
    value: 50,
    confidence: "baja",
    evidence:
      "No disponible en este slice: la persistencia publicitaria requiere datos de Meta Ad Library / TikTok (fase 2).",
  };
}

function evalOportunidadLocal({ trends }: Ctx): DimEval {
  if (!trends.available) {
    return {
      value: 50,
      confidence: "baja",
      evidence: "Sin datos de tendencia US vs AR: gap no verificable.",
    };
  }
  const us = trends.us.direction;
  const ar = trends.ar.direction;
  let score = 50;
  let ev = `US: ${us}, AR: ${ar}.`;
  if (us === "subiendo" && (ar === "estable" || ar === "bajando" || ar === "desconocido")) {
    score = 72;
    ev += " Crece en US y aún incipiente en AR: posible gap de oportunidad.";
  } else if (us === "subiendo" && ar === "subiendo") {
    score = 55;
    ev += " Crece en ambos mercados.";
  } else if (us === "bajando") {
    score = 35;
    ev += " Interés en US decreciente.";
  }
  return { value: score, confidence: "media", evidence: ev };
}

function evalMargen({ ml, input }: Ctx): DimEval {
  if (!ml.available || ml.priceMedian == null) {
    return {
      value: 50,
      confidence: "baja",
      evidence:
        "Sin precio local de referencia: margen no estimable. (El costo de origen se agrega en fase 2.)",
    };
  }
  // Estimación gruesa: si hay ticket objetivo, comparamos contra precio local.
  let ev = `Precio mediano local: ${ml.priceMedian} ${ml.currency ?? ""}.`;
  let score = 50;
  if (input.ticketUsd) {
    ev += ` Ticket objetivo: US$${input.ticketUsd}.`;
    // Sin tipo de cambio ni costo de origen reales, mantenemos confianza baja.
    score = 55;
  }
  return {
    value: score,
    confidence: "baja",
    evidence: ev + " Estimación, no rentabilidad real.",
  };
}

function evalLogistica({ input }: Ctx): DimEval {
  return {
    value: 50,
    confidence: "baja",
    evidence:
      "Heurística no implementada en este slice (peso/volumen/categoría/importación). Requiere metadatos del producto.",
  };
}

function evalDiferenciacion(): DimEval {
  return {
    value: 50,
    confidence: "baja",
    evidence:
      "Cualitativo: se apoya en el análisis del LLM sobre ángulos no explotados (ver secciones del reporte).",
  };
}

function evalRiesgo({ ml }: Ctx): DimEval {
  // Score alto = bajo riesgo.
  const ev =
    "Riesgo base: dependencia de datos parciales y de importación. Revisar categoría sensible/aduana manualmente.";
  return { value: 50, confidence: "baja", evidence: ev };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

const EVALUATORS: Record<ScoreDimension, (ctx: Ctx) => DimEval> = {
  demanda: evalDemanda,
  competencia: evalCompetencia,
  saturacion_local: evalSaturacion,
  persistencia_publicitaria: evalPersistencia,
  oportunidad_local: evalOportunidadLocal,
  margen_potencial: evalMargen,
  logistica: evalLogistica,
  diferenciacion: evalDiferenciacion,
  riesgo: evalRiesgo,
};

function worstConfidence(cs: Confidence[]): Confidence {
  if (cs.includes("baja")) return "baja";
  if (cs.includes("media")) return "media";
  return "alta";
}

export function computeScore(
  ml: MercadoLibreData,
  trends: TrendsData,
  input: AnalyzeInput,
): ScoreResult {
  const ctx: Ctx = { ml, trends, input };
  const dimensions: DimensionScore[] = (
    Object.keys(EVALUATORS) as ScoreDimension[]
  ).map((dim) => {
    const evalResult = EVALUATORS[dim](ctx);
    return {
      dimension: dim,
      label: LABELS[dim],
      value: evalResult.value,
      band: band(evalResult.value),
      weight: WEIGHTS[dim],
      confidence: evalResult.confidence,
      evidence: evalResult.evidence,
    };
  });

  const composite = clamp(
    dimensions.reduce((sum, d) => sum + d.value * d.weight, 0),
  );

  // Confianza global: cuántas dimensiones tienen confianza real.
  const highOrMed = dimensions.filter((d) => d.confidence !== "baja").length;
  const globalConfidence: Confidence =
    highOrMed >= 5 ? "media" : highOrMed >= 2 ? "baja" : "baja";

  return {
    dimensions,
    composite,
    compositeBand: band(composite),
    globalConfidence,
  };
}

/** Deriva la recomendación con reglas transparentes sobre el score. */
export function deriveVerdict(score: ScoreResult): {
  verdict: "testear" | "investigar" | "descartar";
  confidence: Confidence;
} {
  const confidence = score.globalConfidence;
  // Con confianza baja, nunca recomendamos "testear" a ciegas: empujamos a investigar.
  if (score.compositeBand === "alta" && confidence !== "baja") {
    return { verdict: "testear", confidence };
  }
  if (score.compositeBand === "baja") {
    return { verdict: "descartar", confidence };
  }
  return { verdict: "investigar", confidence };
}
