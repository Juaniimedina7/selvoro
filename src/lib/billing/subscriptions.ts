import { prisma } from "@/lib/db/prisma";
import { getPreApprovalClient } from "@/lib/billing/mercadopago/client";
import { grantMonthlyCredits } from "@/lib/billing/credits";
import { getPlanConfig, type PlanCode } from "@/lib/billing/plans";

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Re-consulta el estado autoritativo de una suscripción en Mercado Pago y
 * sincroniza la DB local. La usan tanto el webhook de subscription_preapproval
 * como el cron de reconciliación (red de seguridad si el webhook no llegó).
 * Idempotente: solo otorga el crédito inicial la primera vez que pasa a ACTIVE.
 */
export async function reconcileSubscriptionStatus(mpPreapprovalId: string): Promise<void> {
  const preApproval = await getPreApprovalClient().get({ id: mpPreapprovalId });
  const sub = await prisma.subscription.findUnique({
    where: { mpPreapprovalId },
    include: { plan: true },
  });
  if (!sub) return;

  if (preApproval.status === "authorized") {
    const isFirstActivation = sub.status !== "ACTIVE";
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        currentPeriodStart: sub.currentPeriodStart ?? new Date(),
        currentPeriodEnd: sub.currentPeriodEnd ?? addMonths(new Date(), 1),
        mpPayerId: preApproval.payer_id ? String(preApproval.payer_id) : sub.mpPayerId,
      },
    });
    if (isFirstActivation) {
      await grantMonthlyCredits({
        clerkUserId: sub.clerkUserId,
        subscriptionId: sub.id,
        amount: sub.plan.monthlyCredits,
        reason: "initial_grant",
      });
    }
  } else if (preApproval.status === "cancelled") {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "CANCELLED" } });
  } else if (preApproval.status === "paused") {
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });
  }
}

export async function getActiveSubscription(clerkUserId: string) {
  return prisma.subscription.findFirst({
    where: { clerkUserId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Da de alta una suscripción en Mercado Pago y su registro local en PENDING.
 * El estado pasa a ACTIVE recién cuando llega y se valida el webhook de
 * confirmación (nunca se confía en la respuesta de creación para eso).
 */
export async function createSubscription(params: {
  clerkUserId: string;
  planCode: PlanCode;
  payerEmail: string;
  backUrl: string;
}): Promise<{ initPoint: string }> {
  const { clerkUserId, planCode, payerEmail, backUrl } = params;

  const existing = await getActiveSubscription(clerkUserId);
  if (existing) {
    throw new Error("El usuario ya tiene una suscripción activa.");
  }

  const planConfig = getPlanConfig(planCode);
  if (!planConfig) {
    throw new Error(`Plan desconocido: ${planCode}`);
  }

  const plan = await prisma.plan.upsert({
    where: { code: planConfig.code },
    update: {},
    create: planConfig,
  });

  const preApproval = await getPreApprovalClient().create({
    body: {
      reason: `Selvoro — Plan ${plan.name}`,
      external_reference: clerkUserId,
      payer_email: payerEmail,
      back_url: backUrl,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number(plan.priceArs),
        currency_id: "ARS",
      },
    },
  });

  if (!preApproval.id || !preApproval.init_point) {
    throw new Error("Mercado Pago no devolvió un id/init_point de suscripción válido.");
  }

  await prisma.subscription.create({
    data: {
      clerkUserId,
      planId: plan.id,
      status: "PENDING",
      mpPreapprovalId: preApproval.id,
      mpPayerId: preApproval.payer_id ? String(preApproval.payer_id) : null,
    },
  });

  return { initPoint: preApproval.init_point };
}

export async function cancelSubscription(clerkUserId: string): Promise<void> {
  const sub = await getActiveSubscription(clerkUserId);
  if (!sub) {
    throw new Error("No hay una suscripción activa para cancelar.");
  }

  await getPreApprovalClient().update({
    id: sub.mpPreapprovalId,
    body: { status: "cancelled" },
  });

  // Estado local se actualiza acá directamente (además de confirmarse por
  // webhook luego): MP Preapproval no soporta "cancelar al fin del período",
  // el acceso se corta de inmediato.
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELLED" },
  });
}
