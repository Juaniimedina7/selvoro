import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkAndDebitCredit, refundCredit } from "@/lib/billing/credits";
import { runAnalysis } from "@/lib/pipeline";
import { persistReport } from "@/lib/reports/persist";
import type { AnalyzeInput } from "@/lib/types";
import { analyzeBodySchema } from "@/lib/validation/analyze";

// POST /api/analyze — flujo A. Síncrono en el MVP (el análisis tarda ~10-30s).
// En fase 2 conviene pasar a job asíncrono con run_id (ver plan §10 MCP).
// Requiere sesión + suscripción activa con créditos. El crédito se debita de
// forma atómica ANTES de correr el análisis (evita doble gasto por requests
// concurrentes) y se reintegra si el análisis falla.

export const maxDuration = 60; // segundos (Vercel)

const CREDIT_ERROR: Record<string, { status: number; message: string }> = {
  NO_ACTIVE_PLAN: {
    status: 402,
    message: "No tenés un plan activo. Suscribite en /pricing para analizar productos.",
  },
  PAYMENT_PAST_DUE: {
    status: 402,
    message: "Tu último pago no se pudo procesar. Regularizá tu suscripción para seguir analizando.",
  },
  NO_CREDITS: {
    status: 402,
    message: "Ya usaste todos tus créditos de este ciclo. Esperá la renovación o subí de plan.",
  },
};

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Necesitás iniciar sesión para analizar un producto." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = analyzeBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input inválido." },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Falta ANTHROPIC_API_KEY en el entorno. Copiá .env.example a .env.local y completá la llave.",
      },
      { status: 500 },
    );
  }

  const debit = await checkAndDebitCredit(userId);
  if (!debit.ok) {
    const info = CREDIT_ERROR[debit.code];
    return NextResponse.json({ error: info.message, code: debit.code }, { status: info.status });
  }

  const input: AnalyzeInput = {
    query: parsed.data.query,
    market: "AR",
    ticketUsd: parsed.data.ticketUsd,
  };

  try {
    const report = await runAnalysis(input, { clerkUserId: userId });
    await persistReport({ clerkUserId: userId, subscriptionId: debit.subscriptionId, report });
    return NextResponse.json(report);
  } catch (e) {
    console.error("[/api/analyze] error:", e);
    await refundCredit({
      clerkUserId: userId,
      subscriptionId: debit.subscriptionId,
      reason: "analysis:failed",
    }).catch((refundErr) => console.error("[/api/analyze] refund failed:", refundErr));
    return NextResponse.json(
      { error: "Falló el análisis. Revisá los logs del servidor." },
      { status: 500 },
    );
  }
}
