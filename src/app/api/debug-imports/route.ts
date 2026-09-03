// Ruta de diagnóstico TEMPORAL para el 500 crudo en /api/analyze y /api/chat
// en producción. Importa dinámicamente cada módulo sospechoso dentro de un
// try/catch (a diferencia de un import estático arriba del archivo, esto NO
// rompe el módulo de ESTA ruta si alguno de ellos falla al cargar) y devuelve
// el error real como JSON. Se borra apenas se identifique la causa.

async function tryImport(results: Record<string, string>, name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    results[name] = "ok";
  } catch (e) {
    results[name] = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
  }
}

export async function GET() {
  const results: Record<string, string> = {};

  await tryImport(results, "collectors/mercadolibre", () => import("@/lib/collectors/mercadolibre"));
  await tryImport(results, "collectors/meta-ads", () => import("@/lib/collectors/meta-ads"));
  await tryImport(results, "collectors/trends", () => import("@/lib/collectors/trends"));
  await tryImport(results, "credentials/store", () => import("@/lib/credentials/store"));
  await tryImport(results, "credentials/providers", () => import("@/lib/credentials/providers"));
  await tryImport(results, "report/generate", () => import("@/lib/report/generate"));
  await tryImport(results, "scoring/engine", () => import("@/lib/scoring/engine"));
  await tryImport(results, "billing/credits", () => import("@/lib/billing/credits"));
  await tryImport(results, "auth/roles", () => import("@/lib/auth/roles"));
  await tryImport(results, "reports/persist", () => import("@/lib/reports/persist"));
  await tryImport(results, "validation/analyze", () => import("@/lib/validation/analyze"));
  await tryImport(results, "llm/client", () => import("@/lib/llm/client"));
  await tryImport(results, "db/prisma", () => import("@/lib/db/prisma"));
  await tryImport(results, "pipeline", () => import("@/lib/pipeline"));
  await tryImport(results, "agent/tools", () => import("@/lib/agent/tools"));
  await tryImport(results, "agent/chat", () => import("@/lib/agent/chat"));
  await tryImport(results, "conversations/queries", () => import("@/lib/conversations/queries"));
  await tryImport(results, "conversations/persist", () => import("@/lib/conversations/persist"));

  await tryImport(results, "clerk-auth-call", async () => {
    const { auth } = await import("@clerk/nextjs/server");
    await auth();
  });

  await tryImport(results, "prisma-query", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    await prisma.userCredential.count();
  });

  return Response.json(results);
}
