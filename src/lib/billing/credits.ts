import { prisma } from "@/lib/db/prisma";

export type DebitResult =
  | { ok: true; subscriptionId: string }
  | { ok: false; code: "NO_ACTIVE_PLAN" | "PAYMENT_PAST_DUE" | "NO_CREDITS" };

/**
 * Débito atómico de 1 crédito, a correr ANTES de disparar el análisis (que
 * tarda 10-30s+ y llama a un modelo caro) para evitar doble gasto por
 * requests concurrentes del mismo usuario.
 */
export async function checkAndDebitCredit(clerkUserId: string): Promise<DebitResult> {
  const sub = await prisma.subscription.findFirst({
    where: { clerkUserId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) return { ok: false, code: "NO_ACTIVE_PLAN" };
  if (sub.status === "PAST_DUE") return { ok: false, code: "PAYMENT_PAST_DUE" };

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.subscription.updateMany({
      where: { id: sub.id, creditsRemaining: { gt: 0 } },
      data: { creditsRemaining: { decrement: 1 } },
    });
    if (count === 0) {
      return { ok: false, code: "NO_CREDITS" };
    }
    await tx.creditLedger.create({
      data: {
        clerkUserId,
        subscriptionId: sub.id,
        type: "DEBIT",
        amount: -1,
        reason: "analysis:pending",
      },
    });
    return { ok: true, subscriptionId: sub.id };
  });
}

/** Reintegra el crédito de un análisis que falló después de ser debitado. */
export async function refundCredit(params: {
  clerkUserId: string;
  subscriptionId: string;
  reason: string;
}): Promise<void> {
  const { clerkUserId, subscriptionId, reason } = params;
  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscriptionId },
      data: { creditsRemaining: { increment: 1 } },
    }),
    prisma.creditLedger.create({
      data: { clerkUserId, subscriptionId, type: "REFUND", amount: 1, reason },
    }),
  ]);
}

/** Otorga/resetea los créditos mensuales de una suscripción (alta o renovación). */
export async function grantMonthlyCredits(params: {
  clerkUserId: string;
  subscriptionId: string;
  amount: number;
  reason: "initial_grant" | "monthly_reset";
}): Promise<void> {
  const { clerkUserId, subscriptionId, amount, reason } = params;
  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscriptionId },
      data: { creditsRemaining: amount },
    }),
    prisma.creditLedger.create({
      data: { clerkUserId, subscriptionId, type: "GRANT", amount, reason },
    }),
  ]);
}
