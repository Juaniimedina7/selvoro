import { NextResponse } from "next/server";
import { runAnalysis } from "@/lib/pipeline";
import type { AnalyzeInput } from "@/lib/types";

// POST /api/analyze — flujo A. Síncrono en el MVP (el análisis tarda ~10-30s).
// En fase 2 conviene pasar a job asíncrono con run_id (ver plan §10 MCP).

export const maxDuration = 60; // segundos (Vercel)

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { query, ticketUsd } = (body ?? {}) as {
    query?: unknown;
    ticketUsd?: unknown;
  };

  if (typeof query !== "string" || query.trim().length < 2) {
    return NextResponse.json(
      { error: "Ingresá un producto (nombre o URL), mínimo 2 caracteres." },
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

  const input: AnalyzeInput = {
    query: query.trim(),
    market: "AR",
    ticketUsd:
      typeof ticketUsd === "number" && ticketUsd > 0 ? ticketUsd : undefined,
  };

  try {
    const report = await runAnalysis(input);
    return NextResponse.json(report);
  } catch (e) {
    console.error("[/api/analyze] error:", e);
    return NextResponse.json(
      { error: "Falló el análisis. Revisá los logs del servidor." },
      { status: 500 },
    );
  }
}
