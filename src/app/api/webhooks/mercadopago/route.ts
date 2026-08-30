import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getInvoiceClient } from "@/lib/billing/mercadopago/client";
import { verifyMercadoPagoSignature } from "@/lib/billing/webhookVerify";
import { grantMonthlyCredits } from "@/lib/billing/credits";
import { reconcileSubscriptionStatus } from "@/lib/billing/subscriptions";

// Webhook público de Mercado Pago (sin sesión, protegido por firma HMAC).
// MP manda DOS topics distintos para suscripciones:
// - subscription_preapproval: alta/pausa/cancelación de la suscripción misma.
// - subscription_authorized_payment: cada cobro recurrente individual
//   (acá es donde corresponde resetear los créditos mensuales).
// En ambos casos: nunca confiar en el payload del POST, siempre re-consultar
// el recurso autoritativo antes de mutar estado local.

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const url = new URL(request.url);
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const topic = url.searchParams.get("type") ?? url.searchParams.get("topic");

  const validSignature = verifyMercadoPagoSignature({ xSignature, xRequestId, dataId });
  if (!validSignature) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  if (!dataId) {
    return NextResponse.json({ error: "missing data.id" }, { status: 400 });
  }

  let payload: unknown = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    // body vacío/no JSON es válido para algunas notificaciones de MP
  }

  const externalId = `${topic ?? "unknown"}:${dataId}`;
  const existing = await prisma.webhookEvent.findUnique({ where: { externalId } });
  if (existing?.status === "PROCESSED") {
    return NextResponse.json({ ok: true });
  }
  const event =
    existing ??
    (await prisma.webhookEvent.create({
      data: { externalId, type: topic ?? "unknown", payload: payload as object },
    }));

  try {
    if (topic === "subscription_authorized_payment") {
      await handleAuthorizedPayment(dataId);
    } else {
      // Default: subscription_preapproval (o topic ausente/legado)
      await reconcileSubscriptionStatus(dataId);
    }
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/webhooks/mercadopago] error:", e);
    await prisma.webhookEvent
      .update({ where: { id: event.id }, data: { status: "FAILED" } })
      .catch(() => {});
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}

async function handleAuthorizedPayment(invoiceId: string): Promise<void> {
  const invoice = await getInvoiceClient().get({ id: invoiceId });
  if (!invoice.preapproval_id) return;

  const sub = await prisma.subscription.findUnique({
    where: { mpPreapprovalId: invoice.preapproval_id },
    include: { plan: true },
  });
  if (!sub) return;

  if (invoice.status === "processed") {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "ACTIVE", currentPeriodEnd: addMonths(new Date(), 1) },
    });
    await grantMonthlyCredits({
      clerkUserId: sub.clerkUserId,
      subscriptionId: sub.id,
      amount: sub.plan.monthlyCredits,
      reason: "monthly_reset",
    });
  } else if (invoice.status === "recycling") {
    // Cobro rechazado, MP va a reintentar. Bloqueamos análisis mientras tanto.
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });
  }
}
