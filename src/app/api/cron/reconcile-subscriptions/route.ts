import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { reconcileSubscriptionStatus } from "@/lib/billing/subscriptions";

// Red de seguridad diaria (Vercel Cron) para suscripciones cuyo período venció
// sin que llegara el webhook correspondiente. Re-consulta MP y sincroniza.
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stale = await prisma.subscription.findMany({
    where: {
      status: { in: ["ACTIVE", "PENDING", "PAST_DUE"] },
      OR: [{ currentPeriodEnd: { lt: new Date() } }, { currentPeriodEnd: null }],
    },
    select: { mpPreapprovalId: true },
  });

  let reconciled = 0;
  for (const s of stale) {
    try {
      await reconcileSubscriptionStatus(s.mpPreapprovalId);
      reconciled++;
    } catch (e) {
      console.error("[cron reconcile-subscriptions] failed for", s.mpPreapprovalId, e);
    }
  }

  return NextResponse.json({ checked: stale.length, reconciled });
}
