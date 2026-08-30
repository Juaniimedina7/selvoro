import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cancelSubscription } from "@/lib/billing/subscriptions";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Necesitás iniciar sesión." }, { status: 401 });
  }

  try {
    await cancelSubscription(userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/billing/cancel] error:", e);
    const message = e instanceof Error ? e.message : "Error desconocido.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
