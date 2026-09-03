import { prisma } from "@/lib/db/prisma";
import type { AgentRunKind, AgentRunSource } from "@prisma/client";

/**
 * Persiste un resultado de analyze_product / compare_markets / search_products /
 * search_marketplace_products disparado desde el chat o el MCP. Nunca
 * lanza: es un side effect best-effort (si falla, la tool ya respondió al
 * usuario/agente igual) — el try/catch vive ACÁ ADENTRO para que ningún
 * caller futuro pueda olvidarse de envolverlo.
 */
export async function persistAgentRun(params: {
  clerkUserId: string;
  source: "chat" | "mcp";
  kind: "ANALYZE" | "COMPARE" | "SEARCH" | "MARKETPLACE_SEARCH";
  query: string;
  market?: string | null;
  ticketUsd?: number | null;
  verdict?: string | null;
  confidence?: string | null;
  compositeScore?: number | null;
  payload: unknown;
}): Promise<void> {
  try {
    await prisma.agentRun.create({
      data: {
        clerkUserId: params.clerkUserId,
        source: params.source.toUpperCase() as AgentRunSource,
        kind: params.kind as AgentRunKind,
        query: params.query,
        market: params.market ?? null,
        ticketUsd: params.ticketUsd ?? null,
        verdict: params.verdict ?? null,
        confidence: params.confidence ?? null,
        compositeScore: params.compositeScore ?? null,
        payload: params.payload as object,
      },
    });
  } catch (e) {
    console.error("[agentRuns] persist failed:", e);
  }
}
