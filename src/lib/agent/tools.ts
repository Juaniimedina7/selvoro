import { z } from "zod";
import { gatherEvidence } from "@/lib/pipeline";
import { getSourceStatuses } from "@/lib/collectors/sourceStatus";
import { getTiendaNubeSnapshot } from "@/lib/collectors/tiendanube-store";
import { getMercadoLibreSellerSnapshot } from "@/lib/collectors/mercadolibre-seller";
import { lookupTechStack } from "@/lib/collectors/builtwith";
import { collectMetaAds } from "@/lib/collectors/meta-ads";
import type { MetaAdsData } from "@/lib/types";
import { compareMarkets } from "@/lib/report/compareMarkets";
import { generateTestBrief } from "@/lib/report/generateTestBrief";
import { searchProducts, DEFAULT_MAX_CANDIDATES, HARD_MAX_CANDIDATES } from "@/lib/discovery/searchProducts";
import { getReportPayload, listReports } from "@/lib/reports/queries";
import { listAgentRuns, getAgentRunPayload } from "@/lib/agentRuns/queries";
import { persistAgentRun } from "@/lib/agentRuns/persist";
import { getUserCredential } from "@/lib/credentials/store";
import type { AnalysisEvidence } from "@/lib/types";
import type { AgentRunKind } from "@prisma/client";

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
  source: "chat" | "mcp";
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

// Enums alineados con src/lib/taxonomy/niches.ts.
const COUNTRY_CODES = ["AR", "US", "MX", "BR", "CL", "CO", "ES", "UY", "PE"] as const;
const NICHE_IDS = [
  "salud", "dinero", "relaciones", "recetas", "espiritualidad",
  "padres_educacion", "productividad", "ia", "entretenimiento",
] as const;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const analyzeProductSchema = z.object({
  query: z
    .string()
    .min(2)
    .describe("Nombre del producto, tienda/competidor puntual, o URL de tienda/AliExpress."),
  ticketUsd: z.number().positive().optional().describe("Ticket objetivo en USD (opcional)."),
  market: z.enum(COUNTRY_CODES).optional().describe("Mercado local objetivo (default AR). US se usa como referencia."),
  dateFrom: isoDate.optional().describe("Anuncios activos desde (YYYY-MM-DD, opcional)."),
  dateTo: isoDate.optional().describe("Anuncios activos hasta (YYYY-MM-DD, opcional)."),
});

const analyzeProduct: ToolDef<z.infer<typeof analyzeProductSchema>> = {
  name: "analyze_product",
  title: "Analizar producto o competidor",
  description:
    "Junta evidencia real (Mercado Libre, Google Trends, Meta Ad Library) y un scoring explicable de 9 dimensiones para un producto o una tienda/competidor puntual. Devuelve evidencia CRUDA (señales + score + su explicación determinista por dimensión), no una narrativa redactada — sintetizá vos la lectura para el usuario a partir de esto.",
  schema: analyzeProductSchema,
  handler: async (ctx, input) => {
    const evidence = await gatherEvidence(
      {
        query: input.query,
        market: input.market ?? "AR",
        ticketUsd: input.ticketUsd,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
      },
      { clerkUserId: ctx.clerkUserId },
    );
    await persistAgentRun({
      clerkUserId: ctx.clerkUserId,
      source: ctx.source,
      kind: "ANALYZE",
      query: input.query,
      market: input.market ?? "AR",
      ticketUsd: input.ticketUsd ?? null,
      verdict: evidence.verdict,
      confidence: evidence.confidence,
      compositeScore: evidence.score.composite,
      payload: evidence,
    });
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
  description:
    "Indica qué fuentes de datos están activas, degradadas o no disponibles (Mercado Libre, Google Trends, Meta Ad Library, TikTok). Mercado Libre/Trends reflejan la configuración del servidor; Meta Ad Library refleja SI ESTE USUARIO cargó su propio token en Configuración → Integraciones (cada usuario tiene su propio estado ahí).",
  schema: listSourcesSchema,
  handler: async (ctx) => getSourceStatuses(ctx.clerkUserId),
};

const compareMarketsSchema = z.object({
  query: z.string().min(2).describe("Producto a comparar entre el mercado local y Estados Unidos."),
  market: z.enum(COUNTRY_CODES).optional().describe("Mercado local a comparar contra US (default AR)."),
});

const compareMarketsTool: ToolDef<z.infer<typeof compareMarketsSchema>> = {
  name: "compare_markets",
  title: "Comparar AR vs US",
  description:
    "Compara tendencia de búsqueda y anuncios activos de Meta entre Argentina y Estados Unidos para un producto. Solo soporta AR vs US (los collectors no soportan otros pares de mercado todavía). Evidencia cruda, sin narrativa propia.",
  schema: compareMarketsSchema,
  handler: async (ctx, input) => {
    const comparison = await compareMarkets(
      { query: input.query, market: input.market ?? "AR" },
      { clerkUserId: ctx.clerkUserId },
    );
    await persistAgentRun({
      clerkUserId: ctx.clerkUserId,
      source: ctx.source,
      kind: "COMPARE",
      query: input.query,
      market: input.market ?? "AR",
      payload: comparison,
    });
    return comparison;
  },
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
  country: z.enum(COUNTRY_CODES).optional().describe("Mercado local objetivo (default AR)."),
  niche: z.enum(NICHE_IDS).optional().describe("Nicho para enfocar la búsqueda (opcional)."),
});

const searchProductsTool: ToolDef<z.infer<typeof searchProductsSchema>> = {
  name: "search_products",
  title: "Buscar productos",
  description:
    `Descubre hasta ${HARD_MAX_CANDIDATES} productos candidatos a partir de un criterio en lenguaje libre: un paso de IA brainstormea ideas concretas y CADA UNA pasa por collectors+scoring reales (sin narrativa por candidato). Son ideas generadas por IA y validadas con señales reales, NO un catálogo real de productos ganadores. Dispara 1 llamada de brainstorm + N corridas de collectors — úsalo con criterio.`,
  schema: searchProductsSchema,
  handler: async (ctx, input) => {
    const { results, note, criteria } = await searchProducts({
      criteria: input.criteria,
      maxCandidates: input.maxCandidates,
      clerkUserId: ctx.clerkUserId,
      country: input.country,
      nicheId: input.niche,
    });
    const best = results[0]; // ya vienen ordenados desc por score.composite
    await persistAgentRun({
      clerkUserId: ctx.clerkUserId,
      source: ctx.source,
      kind: "SEARCH",
      query: criteria,
      market: input.country ?? "AR",
      verdict: best?.evidence.verdict ?? null,
      confidence: best?.evidence.confidence ?? null,
      compositeScore: best?.evidence.score.composite ?? null,
      payload: { criteria, note, results },
    });
    return {
      criteria,
      note,
      results: results.map(({ evidence }) => summarizeEvidence(evidence)),
    };
  },
};

const tiendaNubeSnapshotSchema = z.object({});

const tiendaNubeSnapshotTool: ToolDef<z.infer<typeof tiendaNubeSnapshotSchema>> = {
  name: "tienda_nube_snapshot",
  title: "Estado de mi tienda (Tienda Nube)",
  description:
    "Trae datos reales (no proxies) de la tienda de Tienda Nube que el usuario conectó en Configuración → Integraciones: nombre, cantidad de productos, pedidos recientes. Si no conectó ninguna, lo indica explícitamente.",
  schema: tiendaNubeSnapshotSchema,
  handler: async (ctx) => {
    const cred = await getUserCredential(ctx.clerkUserId, "tienda_nube");
    return getTiendaNubeSnapshot(cred?.accessToken, cred?.externalAccountId);
  },
};

const mercadoLibreSellerSnapshotSchema = z.object({});

const mercadoLibreSellerSnapshotTool: ToolDef<z.infer<typeof mercadoLibreSellerSnapshotSchema>> = {
  name: "mercadolibre_seller_snapshot",
  title: "Estado de mi cuenta de Mercado Libre",
  description:
    "Trae datos reales (no proxies) de la cuenta de Mercado Libre que el usuario conectó en Configuración → Integraciones: nickname, cantidad de publicaciones activas (0 si no vende, eso es normal). Ese mismo credential también habilita la búsqueda pública que usa analyze_product cuando no hay un token de servidor cargado. Si no conectó ninguna cuenta, lo indica explícitamente.",
  schema: mercadoLibreSellerSnapshotSchema,
  handler: async (ctx) => {
    const cred = await getUserCredential(ctx.clerkUserId, "mercadolibre_seller");
    return getMercadoLibreSellerSnapshot(cred?.accessToken, cred?.externalAccountId);
  },
};

const lookupTechStackSchema = z.object({
  domain: z.string().min(3).describe("Dominio a inspeccionar, ej. 'competidor.com' (sin https://)."),
});

const lookupTechStackTool: ToolDef<z.infer<typeof lookupTechStackSchema>> = {
  name: "lookup_tech_stack",
  title: "Stack tecnológico de un dominio",
  description:
    "Detecta qué tecnologías usa la tienda/sitio de un dominio (ej. si corre en Tienda Nube, Shopify, WooCommerce) vía BuiltWith. Server-side, no depende de credenciales del usuario. Señal de sofisticación/inversión del competidor, no una métrica de ventas.",
  schema: lookupTechStackSchema,
  handler: async (_ctx, input) => lookupTechStack(input.domain),
};

const listAnalysesSchema = z.object({
  kind: z
    .enum(["ANALYZE", "COMPARE", "SEARCH"])
    .optional()
    .describe("Filtrar por tipo de análisis (opcional): ANALYZE (analyze_product), COMPARE (compare_markets), SEARCH (search_products)."),
});

const listAnalysesTool: ToolDef<z.infer<typeof listAnalysesSchema>> = {
  name: "list_analyses",
  title: "Listar análisis guardados (chat/MCP)",
  description:
    "Lista el historial de analyze_product / compare_markets / search_products corridos desde el chat o el MCP, con su id, tipo, query, veredicto (si aplica) y fecha. Distinto de list_reports, que solo lista reportes generados desde el formulario web.",
  schema: listAnalysesSchema,
  handler: async (ctx, input) => listAgentRuns(ctx.clerkUserId, input.kind as AgentRunKind | undefined),
};

const getAnalysisSchema = z.object({
  id: z.string().describe("Id de un análisis guardado (devuelto por list_analyses o por el resultado de una tool previa)."),
});

const getAnalysisTool: ToolDef<z.infer<typeof getAnalysisSchema>> = {
  name: "get_analysis",
  title: "Ver análisis guardado (chat/MCP)",
  description:
    "Devuelve el payload completo de un análisis guardado por su id: evidencia cruda de analyze_product/compare_markets, o el set completo de candidatos (sin resumir) de search_products.",
  schema: getAnalysisSchema,
  handler: async (ctx, input) => {
    const payload = await getAgentRunPayload(ctx.clerkUserId, input.id);
    if (!payload) return { error: "No se encontró ese análisis para este usuario." };
    return payload;
  },
};

const metaAdsSnapshotSchema = z.object({
  query: z.string().min(2).describe("Término de búsqueda para Meta Ad Library (nombre de producto, marca, etc.)."),
  market: z.enum(COUNTRY_CODES).optional().describe("Mercado local a inspeccionar (default AR). Siempre se compara contra US."),
  dateFrom: isoDate.optional().describe("Anuncios activos desde (YYYY-MM-DD, opcional)."),
  dateTo: isoDate.optional().describe("Anuncios activos hasta (YYYY-MM-DD, opcional)."),
});

const metaAdsSnapshotTool: ToolDef<z.infer<typeof metaAdsSnapshotSchema>> = {
  name: "meta_ads_snapshot",
  title: "Buscar en Meta Ad Library",
  description:
    "Busca anuncios activos en Meta Ad Library por término, usando el access token que el usuario cargó en Configuración → Integraciones. A diferencia de tienda_nube_snapshot/mercadolibre_seller_snapshot, esto NO es un estado de cuenta propia (Meta no expone 'tus anuncios') — es una búsqueda cruda y sin scoring, la misma fuente que usa analyze_product internamente pero standalone y sin el resto del análisis. Si el usuario no cargó token, lo indica explícitamente.",
  schema: metaAdsSnapshotSchema,
  handler: async (ctx, input) => {
    const cred = await getUserCredential(ctx.clerkUserId, "meta_ads");
    const result = await collectMetaAds(
      input.query,
      cred?.accessToken,
      input.market ?? "AR",
      input.dateFrom,
      input.dateTo,
    );
    return (result.raw?.metaAds as MetaAdsData | undefined) ?? { available: false, note: result.error ?? "Sin datos." };
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
  tiendaNubeSnapshotTool,
  mercadoLibreSellerSnapshotTool,
  lookupTechStackTool,
  listAnalysesTool,
  getAnalysisTool,
  metaAdsSnapshotTool,
] as unknown as ToolDef<unknown>[];
