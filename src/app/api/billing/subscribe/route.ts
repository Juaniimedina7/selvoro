import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSubscription } from "@/lib/billing/subscriptions";
import { PLANS } from "@/lib/billing/plans";

const bodySchema = z.object({
  planCode: z.enum(PLANS.map((p) => p.code) as [string, ...string[]]),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Necesitás iniciar sesión." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plan inválido." }, { status: 400 });
  }

  const user = await currentUser();
  const payerEmail = user?.primaryEmailAddress?.emailAddress;
  if (!payerEmail) {
    return NextResponse.json(
      { error: "Tu cuenta no tiene un email verificado, necesario para Mercado Pago." },
      { status: 400 },
    );
  }

  try {
    const { initPoint } = await createSubscription({
      clerkUserId: userId,
      planCode: parsed.data.planCode as (typeof PLANS)[number]["code"],
      payerEmail,
      backUrl: `${new URL(request.url).origin}/dashboard?subscribed=1`,
    });
    return NextResponse.json({ initPoint });
  } catch (e) {
    console.error("[/api/billing/subscribe] error:", e);
    const message = e instanceof Error ? e.message : "Error desconocido.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
