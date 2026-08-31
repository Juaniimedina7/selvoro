import { COUNTRIES } from "@/lib/taxonomy/niches";
import type {
  AnalyzeInput,
  Confidence,
  DimensionScore,
  MercadoLibreData,
  MetaAdsData,
  MetaAdsMarketData,
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
  metaAds: MetaAdsData;
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

function evalSaturacion({ ml, metaAds }: Ctx): DimEval {
  // Diferenciador clave (plan §9). Combina listings de ML (conteo real) con
  // anunciantes distintos activos en Meta Ads AR (muestra, hasta 100 anuncios).
  let mlScore: number | null = null;
  let mlEv = "";
  if (ml.available && ml.totalListings != null) {
    const t = ml.totalListings;
    if (t < 30) {
      mlScore = 70;
      mlEv = `ML: ${t} publicaciones (saturación baja)`;
    } else if (t < 150) {
      mlScore = 45;
      mlEv = `ML: ${t} publicaciones (saturación media)`;
    } else {
      mlScore = 20;
      mlEv = `ML: ${t} publicaciones (saturación alta)`;
    }
  }

  const ar = metaAds.available ? metaAds.ar : null;
  let metaScore: number | null = null;
  let metaEv = "";
  if (ar && ar.uniqueAdvertisers != null) {
    const a = ar.uniqueAdvertisers;
    if (a === 0) {
      metaScore = 75;
      metaEv = "Meta: 0 anunciantes activos detectados (saturación baja)";
    } else if (a <= 3) {
      metaScore = 60;
      metaEv = `Meta: ${a} anunciantes distintos con ads activos (saturación media-baja)`;
    } else if (a <= 8) {
      metaScore = 35;
      metaEv = `Meta: ${a} anunciantes distintos con ads activos (saturación media-alta)`;
    } else {
      metaScore = 15;
      metaEv = `Meta: ${a} anunciantes distintos con ads activos (saturación alta)`;
    }
  }

  if (mlScore != null && metaScore != null) {
    const value = clamp(mlScore * 0.55 + metaScore * 0.45);
    let confidence: Confidence = "media";
    let ev = `${mlEv}; ${metaEv}. Estimación combinada.`;
    if (ar?.truncated) {
      confidence = "baja";
      ev += " El conteo de anunciantes de Meta es un piso (resultados truncados a 100), no el total real.";
    }
    return { value, confidence, evidence: ev };
  }
  if (mlScore != null) {
    return {
      value: mlScore,
      confidence: "baja",
      evidence: `${mlEv}, sin datos de Meta Ads (token no configurado o sin anunciantes detectados).`,
    };
  }
  if (metaScore != null) {
    return {
      value: metaScore,
      confidence: "baja",
      evidence: `${metaEv}, sin datos de Mercado Libre.`,
    };
  }
  return {
    value: 50,
    confidence: "baja",
    evidence: "Sin datos de Mercado Libre ni de Meta Ads: saturación no verificable.",
  };
}

function evalPersistencia({ metaAds }: Ctx): DimEval {
  if (!metaAds.available) {
    return {
      value: 50,
      confidence: "baja",
      evidence: "Sin acceso a Meta Ad Library: persistencia publicitaria no verificable.",
    };
  }

  const arHasAds = metaAds.ar && (metaAds.ar.activeAdsCount ?? 0) > 0;
  const usHasAds = metaAds.us && (metaAds.us.activeAdsCount ?? 0) > 0;

  if (!arHasAds && !usHasAds) {
    return {
      value: 35,
      confidence: "baja",
      evidence: `Meta Ad Library no devolvió anuncios activos para "${metaAds.searchTermsUsed}" ni en AR ni en US. Puede ser señal real de baja inversión publicitaria, o un término de búsqueda que no matchea el copy real de los anuncios. Tratar como señal débil, no como ausencia confirmada.`,
    };
  }

  const usedFallback = !arHasAds && usHasAds;
  const market: MetaAdsMarketData = (usedFallback ? metaAds.us : metaAds.ar)!;
  const maxDays = market.maxActiveDays ?? 0;
  const count = market.activeAdsCount ?? 0;

  let base: number;
  if (maxDays >= 90) base = 85;
  else if (maxDays >= 45) base = 70;
  else if (maxDays >= 21) base = 55;
  else if (maxDays >= 7) base = 40;
  else if (maxDays >= 1) base = 28;
  else base = 25;

  let adjustment = 0;
  if (count >= 5) adjustment = 10;
  else if (count >= 2) adjustment = 5;

  const value = clamp(base + adjustment);

  if (usedFallback) {
    return {
      value,
      confidence: "baja",
      evidence: `Sin anuncios activos en AR; en US se detectaron ${count} anuncio(s) (el más antiguo con ${maxDays} días activo) — señal indirecta, no confirma tracción local.`,
    };
  }

  const confidence: Confidence = count > 0 && !market.truncated ? "media" : "baja";
  return {
    value,
    confidence,
    evidence: `${count} anuncio(s) activo(s) detectado(s) en Meta Ad Library (AR); el más antiguo lleva ${maxDays} días corriendo.`,
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
      "Cualitativo por diseño: los creative snippets de Meta Ads (cuando existen) se pasan al LLM como evidencia para sugerir ángulos, pero no se convierten en score — es una muestra parcial y sesgada, convertirla en un número sería falsa precisión.",
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
  metaAds: MetaAdsData,
  input: AnalyzeInput,
): ScoreResult {
  const ctx: Ctx = { ml, trends, metaAds, input };
  // Etiquetas dinámicas: el mercado local depende de input.market (no siempre AR).
  const home = COUNTRIES.find((c) => c.code === input.market)?.label ?? input.market;
  const labels: Record<ScoreDimension, string> = {
    ...LABELS,
    saturacion_local: `Saturación local (${home})`,
    oportunidad_local: `Oportunidad local (gap US↔${input.market})`,
  };
  const dimensions: DimensionScore[] = (
    Object.keys(EVALUATORS) as ScoreDimension[]
  ).map((dim) => {
    const evalResult = EVALUATORS[dim](ctx);
    return {
      dimension: dim,
      label: labels[dim],
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
