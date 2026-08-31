import { prisma } from "@/lib/db/prisma";
import type { AgentRunKind } from "@prisma/client";

export async function listAgentRuns(clerkUserId: string, kind?: AgentRunKind) {
  return prisma.agentRun.findMany({
    where: { clerkUserId, ...(kind ? { kind } : {}) },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      source: true,
      query: true,
      market: true,
      verdict: true,
      compositeScore: true,
      createdAt: true,
    },
  });
}

export async function getAgentRun(clerkUserId: string, id: string) {
  return prisma.agentRun.findFirst({ where: { id, clerkUserId } });
}

export async function getAgentRunPayload(clerkUserId: string, id: string): Promise<unknown | null> {
  const row = await prisma.agentRun.findFirst({ where: { id, clerkUserId }, select: { payload: true } });
  return row?.payload ?? null;
}
