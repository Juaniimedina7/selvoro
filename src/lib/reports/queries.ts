import { prisma } from "@/lib/db/prisma";
import type { Report } from "@/lib/types";

export async function listReports(clerkUserId: string) {
  return prisma.report.findMany({
    where: { clerkUserId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      query: true,
      verdict: true,
      confidence: true,
      compositeScore: true,
      createdAt: true,
    },
  });
}

export async function getReportPayload(
  clerkUserId: string,
  id: string,
): Promise<Report | null> {
  const row = await prisma.report.findFirst({
    where: { id, clerkUserId },
    select: { payload: true },
  });
  return (row?.payload as unknown as Report) ?? null;
}
