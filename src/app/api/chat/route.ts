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
  // nueva en silencio si el cliente tiene un bug. La persistencia de
  // conversaciones es best-effort: si la DB falla acá (tabla faltante,
  // conexión caída), el chat tiene que seguir funcionando igual, solo sin
  // guardar el historial de este turno — nunca bloquear la respuesta del
  // agente por esto.
  let resolvedConversationId: string | null = null;
  if (conversationId) {
    try {
      const existing = await getConversation(userId, conversationId);
      if (!existing) {
        return new Response("Conversación no encontrada.", { status: 404 });
      }
      resolvedConversationId = existing.id;
    } catch (e) {
      console.error("[/api/chat] getConversation falló:", e);
    }
  } else {
    try {
      const created = await upsertConversationMessages({ clerkUserId: userId, messages: chatMessages });
      resolvedConversationId = created.id;
    } catch (e) {
      console.error("[/api/chat] crear conversación falló:", e);
    }
  }

  const encoder = new TextEncoder();
  let fullAssistantText = "";

  // Protocolo NDJSON: una línea JSON por evento.
  // {"type":"text","delta":"..."} — delta de prosa del LLM (como antes, pero
  //   ahora envuelto para poder intercalarlo con lo de abajo).
  // {"type":"tool_start","tool":"analyze_product"} — la tool empezó a
  //   correr, todavía sin resultado. Algunas (search_marketplace_products
  //   contra Apify) pueden tardar decenas de segundos — sin este evento el
  //   frontend no tiene ninguna señal entre el último texto y el resultado,
  //   y da la sensación de que el chat se colgó.
  // {"type":"tool_result","tool":"analyze_product","data":{...}} — resultado
  //   CRUDO de una tool call (mismo objeto que ya recibe el LLM), para que el
  //   frontend arme una card de React sin depender de que el modelo lo
  //   reformule/repita en texto.
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  function emit(event: Record<string, unknown>) {
    controllerRef?.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
  }

  let runner: ReturnType<typeof createChatToolRunner>;
  try {
    runner = createChatToolRunner(userId, messages as Anthropic.Beta.BetaMessageParam[], {
      onToolStart: (toolName) => emit({ type: "tool_start", tool: toolName }),
      onToolResult: (toolName, data) => emit({ type: "tool_result", tool: toolName, data }),
    });
  } catch (e) {
    console.error("[/api/chat] createChatToolRunner falló:", e);
    return new Response("No se pudo iniciar el agente. Probá de nuevo en un rato.", { status: 500 });
  }

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      controllerRef = controller;
      try {
        for await (const stream of runner) {
          stream.on("text", (delta: string) => {
            fullAssistantText += delta;
            emit({ type: "text", delta });
          });
          const message = await stream.finalMessage();
          if (message.stop_reason === "pause_turn") {
            runner.pushMessages({ role: "assistant", content: message.content });
          }
        }
      } catch (e) {
        console.error("[/api/chat] error:", e);
        emit({ type: "text", delta: "\n\n[No se pudo completar la respuesta. Probá de nuevo.]" });
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

  const headers: Record<string, string> = { "Content-Type": "application/x-ndjson; charset=utf-8" };
  if (resolvedConversationId) headers["X-Conversation-Id"] = resolvedConversationId;

  return new Response(readable, { headers });
}
