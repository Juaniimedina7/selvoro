import { z } from "zod";
import { gatherEvidence } from "@/lib/pipeline";
import { getSourceStatuses } from "@/lib/collectors/sourceStatus";
import { compareMarkets } from "@/lib/report/compareMarkets";
import { generateTestBrief } from "@/lib/report/generateTestBrief";
import { searchProducts, DEFAULT_MAX_CANDIDATES, HARD_MAX_CANDIDATES } from "@/lib/discovery/searchProducts";
import { getReportPayload, listReports } from "@/lib/reports/queries";
import type { AnalysisEvidence } from "@/lib/types";

// Definición única de las tools de Selvoro. Dos adaptadores las consumen:
// - src/lib/agent/chat.ts (Tool Runner de Anthropic, vía betaZodTool)
// - src/app/api/[transport]/route.ts (servidor MCP remoto, vía server.registerTool)
//
// Diseño de costo: analyze_product, compare_markets y cada candidato de
// search_products devuelven EVIDENCIA CRUDA (collectors + scoring
// determinista), sin narrativa propia — el LLM que llama a la tool (nuestro
// chat o el cliente MCP externo) ya tiene su propia capacidad de síntesis y
// paga sus propios tokens; no tiene sentido que nosotros paguemos una llamada
// a Claude adicional por cada tool call. Cada dimensión del score ya trae un
// `evidence` textual determinista (armado en scoring/engine.ts, sin LLM) que
// alcanza como grounding para que el agente redacte su propia lectura.
// get_report/list_reports siguen devolviendo reportes YA persistidos con
// narrativa completa (creados por el formulario web, /api/analyze).

export interface ToolContext {
  clerkUserId: string;
}

export interface ToolDef<TInput> {
  name: string;
  title: string;
  description: string;
  /** ZodObject (no un ZodType genérico): el registro MCP necesita `.shape` para armar el inputSchema. */
  schema: z.ZodObject<z.ZodRawShape>;
  handler: (ctx: ToolContext, input: TInput) => Promise<unknown>;
}

/** Proyección de evidencia cruda para las tools que NO generan narrativa propia. */
function summarizeEvidence(evidence: AnalysisEvidence) {
  return {
    query: evidence.input.query,
    verdict: evidence.verdict,
    confidence: evidence.confidence,
    compositeBand: evidence.score.compositeBand,
    dimensions: evidence.score.dimensions.map((d) => ({
      label: d.label,
      band: d.band,
      confidence: d.confidence,
      evidence: d.evidence,
    })),
    dataCoverageNote: evidence.dataCoverageNote,
    sources: evidence.sources,
  };
}

const analyzeProductSchema = z.object({
  query: z
    .string()
    .min(2)
    .describe("Nombre del producto, tienda/competidor puntual, o URL de tienda/AliExpress."),
  ticketUsd: z.number().positive().optional().describe("Ticket objetivo en USD (opcional)."),
});

const analyzeProduct: ToolDef<z.infer<typeof analyzeProductSchema>> = {
  name: "analyze_product",
  title: "Analizar producto o competidor",
  description:
    "Junta evidencia real (Mercado Libre, Google Trends, Meta Ad Library) y un scoring explicable de 9 dimensiones para un producto o una tienda/competidor puntual. Devuelve evidencia CRUDA (señales + score + su explicación determinista por dimensión), no una narrativa redactada — sintetizá vos la lectura para el usuario a partir de esto.",
  schema: analyzeProductSchema,
  handler: async (_ctx, input) => {
    const evidence = await gatherEvidence({ query: input.query, market: "AR", ticketUsd: input.ticketUsd });
    return summarizeEvidence(evidence);
  },
};

const getReportSchema = z.object({
  reportId: z.string().describe("Id de un reporte guardado (creado desde el formulario web)."),
});

const getReport: ToolDef<z.infer<typeof getReportSchema>> = {
  name: "get_report",
  title: "Ver reporte guardado",
  description:
    "Devuelve un reporte completo YA guardado (con narrativa redactada), creado previamente desde el formulario web del usuario. No incluye análisis hechos desde el chat/MCP (esos no se persisten).",
  schema: getReportSchema,
  handler: async (ctx, input) => {
    const report = await getReportPayload(ctx.clerkUserId, input.reportId);
    if (!report) return { error: "No se encontró ese reporte para este usuario." };
    return report;
  },
};

const listReportsSchema = z.object({});

const listReportsTool: ToolDef<z.infer<typeof listReportsSchema>> = {
  name: "list_reports",
  title: "Listar reportes guardados",
  description: "Lista el historial de reportes guardados del usuario (creados desde el formulario web): query, veredicto, fecha.",
  schema: listReportsSchema,
  handler: async (ctx) => listReports(ctx.clerkUserId),
};

const listSourcesSchema = z.object({});

const listSourcesTool: ToolDef<z.infer<typeof listSourcesSchema>> = {
  name: "list_sources",
  title: "Fuentes de datos",
  description: "Indica qué fuentes de datos están activas, degradadas o no disponibles (Mercado Libre, Google Trends, Meta Ad Library, TikTok).",
  schema: listSourcesSchema,
  handler: async () => getSourceStatuses(),
};

const compareMarketsSchema = z.object({
  query: z.string().min(2).describe("Producto a comparar entre Argentina y Estados Unidos."),
});

const compareMarketsTool: ToolDef<z.infer<typeof compareMarketsSchema>> = {
  name: "compare_markets",
  title: "Comparar AR vs US",
  description:
    "Compara tendencia de búsqueda y anuncios activos de Meta entre Argentina y Estados Unidos para un producto. Solo soporta AR vs US (los collectors no soportan otros pares de mercado todavía). Evidencia cruda, sin narrativa propia.",
  schema: compareMarketsSchema,
  handler: async (_ctx, input) => compareMarkets({ query: input.query, market: "AR" }),
};

const generateTestBriefSchema = z.object({
  reportId: z.string().describe("Id de un reporte YA guardado (creado desde el formulario web, con narrativa)."),
});

const generateTestBriefTool: ToolDef<z.infer<typeof generateTestBriefSchema>> = {
  name: "generate_test_brief",
  title: "Generar brief de testeo",
  description:
    "A partir de un reporte guardado (con narrativa), genera un brief de testeo publicitario: ángulos, hooks, público objetivo, oferta sugerida, presupuesto inicial en banda y plan de la primera semana.",
  schema: generateTestBriefSchema,
  handler: async (ctx, input) => {
    const report = await getReportPayload(ctx.clerkUserId, input.reportId);
    if (!report) return { error: "No se encontró ese reporte para este usuario." };
    return generateTestBrief(report);
  },
};

const searchProductsSchema = z.object({
  criteria: z
    .string()
    .min(5)
    .describe(
      "Criterio en lenguaje libre: nicho, público, rango de ticket, etc. Ej: 'productos de hogar en crecimiento, ticket USD30-80, para mujeres 25-45'.",
    ),
  maxCandidates: z
    .number()
    .int()
    .positive()
    .max(HARD_MAX_CANDIDATES)
    .optional()
    .describe(`Cantidad de candidatos a evaluar (default ${DEFAULT_MAX_CANDIDATES}, máximo ${HARD_MAX_CANDIDATES}).`),
});

const searchProductsTool: ToolDef<z.infer<typeof searchProductsSchema>> = {
  name: "search_products",
  title: "Buscar productos",
  description:
    `Descubre hasta ${HARD_MAX_CANDIDATES} productos candidatos a partir de un criterio en lenguaje libre: un paso de IA brainstormea ideas concretas y CADA UNA pasa por collectors+scoring reales (sin narrativa por candidato). Son ideas generadas por IA y validadas con señales reales, NO un catálogo real de productos ganadores. Dispara 1 llamada de brainstorm + N corridas de collectors — úsalo con criterio.`,
  schema: searchProductsSchema,
  handler: async (_ctx, input) => {
    const { results, note, criteria } = await searchProducts({
      criteria: input.criteria,
      maxCandidates: input.maxCandidates,
    });
    return {
      criteria,
      note,
      results: results.map(({ evidence }) => summarizeEvidence(evidence)),
    };
  },
};

export const AGENT_TOOLS: ToolDef<unknown>[] = [
  analyzeProduct,
  getReport,
  listReportsTool,
  listSourcesTool,
  compareMarketsTool,
  generateTestBriefTool,
  searchProductsTool,
] as unknown as ToolDef<unknown>[];
