import { prisma } from "@/lib/db/prisma";
import type { Report } from "@/lib/types";

/**
 * Guarda el Report completo (payload JSON) con los campos denormalizados para
 * listar rápido. `subscriptionId` es opcional: los reportes creados desde el
 * chat o el MCP no están atados a un débito de crédito (sin gating por ahora).
 */
export async function persistReport(params: {
  clerkUserId: string;
  subscriptionId?: string | null;
  report: Report;
}): Promise<{ id: string }> {
  const { clerkUserId, subscriptionId = null, report } = params;
  const saved = await prisma.report.create({
    data: {
      clerkUserId,
      subscriptionId,
      query: report.input.query,
      ticketUsd: report.input.ticketUsd ?? null,
      verdict: report.recommendation.verdict,
      confidence: report.recommendation.confidence,
      compositeScore: report.score.composite,
      payload: report as unknown as object,
    },
    select: { id: true },
  });
  return saved;
}
