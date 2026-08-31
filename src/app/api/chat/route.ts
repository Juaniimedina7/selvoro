import type Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { createChatToolRunner } from "@/lib/agent/chat";
import { getConversation } from "@/lib/conversations/queries";
import { upsertConversationMessages, type ChatMessage } from "@/lib/conversations/persist";

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

  const { messages, conversationId } = (body ?? {}) as {
    messages?: unknown;
    conversationId?: string | null;
  };
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Falta el array de mensajes.", { status: 400 });
  }
  const chatMessages = messages as ChatMessage[];

  // Resolvemos el conversationId ANTES de tocar el LLM: si viene uno y no es
  // del usuario (o no existe), 404 inmediato — no gastamos un turno de
  // modelo sobre un id inválido/spoofeado, ni arrancamos una conversación
  // nueva en silencio si el cliente tiene un bug.
  let resolvedConversationId: string;
  if (conversationId) {
    const existing = await getConversation(userId, conversationId);
    if (!existing) {
      return new Response("Conversación no encontrada.", { status: 404 });
    }
    resolvedConversationId = existing.id;
  } else {
    const created = await upsertConversationMessages({ clerkUserId: userId, messages: chatMessages });
    resolvedConversationId = created.id;
  }

  const runner = createChatToolRunner(userId, messages as Anthropic.Beta.BetaMessageParam[]);

  const encoder = new TextEncoder();
  let fullAssistantText = "";
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const stream of runner) {
          stream.on("text", (delta: string) => {
            fullAssistantText += delta;
            controller.enqueue(encoder.encode(delta));
          });
          const message = await stream.finalMessage();
          if (message.stop_reason === "pause_turn") {
            runner.pushMessages({ role: "assistant", content: message.content });
          }
        }
      } catch (e) {
        console.error("[/api/chat] error:", e);
        controller.enqueue(encoder.encode("\n\n[No se pudo completar la respuesta. Probá de nuevo.]"));
      } finally {
        try {
          await upsertConversationMessages({
            id: resolvedConversationId,
            clerkUserId: userId,
            messages: [...chatMessages, { role: "assistant", content: fullAssistantText }],
          });
        } catch (e) {
          console.error("[/api/chat] persist conversation failed:", e);
        }
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Conversation-Id": resolvedConversationId,
    },
  });
}
