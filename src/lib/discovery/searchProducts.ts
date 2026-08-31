import { getLlm } from "@/lib/llm/client";
import { gatherEvidence } from "@/lib/pipeline";
import {
  getNiche,
  taxonomyGuidanceForAgent,
  type CountryCode,
  type NicheId,
} from "@/lib/taxonomy/niches";
import type { AnalysisEvidence } from "@/lib/types";

// search_products: NO hay base de datos de "productos ganadores". Se hace en
// dos pasos: (1) el LLM brainstormea hasta N candidatos concretos a partir de
// un criterio en lenguaje libre (pura ideación, sin datos reales todavía), y
// (2) cada candidato pasa por gatherEvidence (collectors + scoring, SIN
// narrativa LLM propia — el agente que llama a la tool ya puede sintetizar su
// propia lectura a partir de la evidencia). El resultado es un ranking de
// ideas validadas con señales reales, nunca un catálogo real de productos.
//
// Costo: 1 sola llamada LLM (el brainstorm) + N corridas de collectors sin
// LLM. Capado duro para no disparar costo/latencia sin control.

export const DEFAULT_MAX_CANDIDATES = 5;
export const HARD_MAX_CANDIDATES = 8;

const BRAINSTORM_SYSTEM = `Sos "Selvoro", un analista de e-commerce brainstormeando ideas de productos a partir de un criterio en lenguaje libre.

REGLAS ESTRICTAS:
- Esto es SOLO ideación: no tenés acceso a datos de ventas ni tendencias reales en este paso. No afirmes que un producto "está vendiendo" o "es tendencia" — eso se valida después con datos reales.
- Proponé productos FÍSICOS o DIGITALES concretos y buscables (ej. "masajeador cervical eléctrico", no "algo para el cuello").
- Cada candidato debe ser un término de búsqueda razonable para Mercado Libre / Meta Ad Library — evitá frases largas o marcas específicas.
- No repitas variantes del mismo producto.

Si el criterio apunta a productos digitales / infoproductos, usá el siguiente vocabulario como referencia (elegí lo relevante, no lo uses todo):

${taxonomyGuidanceForAgent()}`;

const BRAINSTORM_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  properties: {
    candidatos: {
      type: "array",
      items: { type: "string" },
      description: "Términos de búsqueda concretos, uno por producto candidato.",
    },
  },
  required: ["candidatos"],
};

export interface SearchProductsCandidate {
  query: string;
  evidence: AnalysisEvidence;
}

export interface SearchProductsResult {
  criteria: string;
  candidatesRequested: number;
  results: SearchProductsCandidate[];
  note: string;
}

export async function searchProducts(params: {
  criteria: string;
  maxCandidates?: number;
  clerkUserId?: string;
  country?: CountryCode;
  nicheId?: NicheId;
}): Promise<SearchProductsResult> {
  const maxCandidates = Math.min(
    Math.max(1, params.maxCandidates ?? DEFAULT_MAX_CANDIDATES),
    HARD_MAX_CANDIDATES,
  );
  const market: CountryCode = params.country ?? "AR";

  const niche = params.nicheId ? getNiche(params.nicheId) : undefined;
  const nicheHint = niche
    ? `\n\nNicho enfocado: ${niche.label}. Keywords de referencia (elegí las relevantes, no todas): ${niche.keywords.join(", ")}.`
    : "";

  const brainstorm = await getLlm().generateJson<{ candidatos: string[] }>({
    system: BRAINSTORM_SYSTEM,
    user: `Criterio del usuario: "${params.criteria}"\nMercado local objetivo: ${market}.${nicheHint}\n\nProponé hasta ${maxCandidates} productos candidatos concretos. Devolvé el JSON pedido.`,
    schema: BRAINSTORM_SCHEMA,
  });

  const candidateQueries = brainstorm.candidatos.slice(0, maxCandidates);

  const evidences = await Promise.all(
    candidateQueries.map((query) =>
      gatherEvidence({ query, market }, { clerkUserId: params.clerkUserId }),
    ),
  );

  const results: SearchProductsCandidate[] = candidateQueries
    .map((query, i) => ({ query, evidence: evidences[i] }))
    .sort((a, b) => b.evidence.score.composite - a.evidence.score.composite);

  return {
    criteria: params.criteria,
    candidatesRequested: maxCandidates,
    results,
    note:
      "Los candidatos son ideas generadas por IA y validadas con las mismas señales que analyze_product " +
      "(Mercado Libre, Google Trends, Meta Ad Library). No es un catálogo real de productos ganadores. " +
      "Cada candidato trae evidencia cruda (sin narrativa) — sintetizá vos la lectura para el usuario.",
  };
}
