import type Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { createChatToolRunner } from "@/lib/agent/chat";

// POST /api/chat — agente conversacional (streaming). Requiere sesión.
// Sin gating de créditos por ahora (decisión de producto, ver plan).
// search_products puede fan-out varios análisis en paralelo: maxDuration más
// alto que /api/analyze. En plan Hobby de Vercel el límite real es 60s
// igual — ajustar según el plan real del deploy.
export const maxDuration = 120;

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Necesitás iniciar sesión.", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("JSON inválido.", { status: 400 });
  }

  const { messages } = (body ?? {}) as { messages?: unknown };
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Falta el array de mensajes.", { status: 400 });
  }

  const runner = createChatToolRunner(userId, messages as Anthropic.Beta.BetaMessageParam[]);

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const stream of runner) {
          stream.on("text", (delta: string) => controller.enqueue(encoder.encode(delta)));
          const message = await stream.finalMessage();
          if (message.stop_reason === "pause_turn") {
            runner.pushMessages({ role: "assistant", content: message.content });
          }
        }
      } catch (e) {
        console.error("[/api/chat] error:", e);
        controller.enqueue(encoder.encode("\n\n[No se pudo completar la respuesta. Probá de nuevo.]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
