"use client";

import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ToolResultCard } from "./cards/ToolResultCard";

// Shape que persiste la DB / que se reenvía al backend como historial —
// siempre texto plano, nunca bloques (ver Conversation.messages en Prisma).
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Bloques de un mensaje del asistente EN PANTALLA. "text" es prosa del LLM
// (se renderiza como Markdown); "tool_result" es el dato crudo de una tool
// call (se renderiza como card de React) — llegan intercalados en el orden
// real en que el agente los fue produciendo.
type AssistantBlock =
  | { type: "text"; text: string }
  | { type: "tool_result"; tool: string; data: unknown };

type UiMessage = { role: "user"; content: string } | { role: "assistant"; blocks: AssistantBlock[] };

interface ConversationSummary {
  id: string;
  title: string | null;
  updatedAt: string;
}

interface ChatWindowProps {
  initialConversations: ConversationSummary[];
}

// El backend solo persiste/reenvía prosa (Conversation.messages guarda
// {role, content: string}[]) — las cards son una mejora de la sesión en
// vivo, no sobreviven a un reload. Acá se aplanan los bloques de texto de
// vuelta a un string para mandarlos como historial en el próximo POST.
function toApiMessages(uiMessages: UiMessage[]): ChatMessage[] {
  return uiMessages.map((m) =>
    m.role === "user"
      ? { role: "user", content: m.content }
      : {
          role: "assistant",
          content: m.blocks
            .filter((b): b is { type: "text"; text: string } => b.type === "text")
            .map((b) => b.text)
            .join(""),
        },
  );
}

function applyStreamEvent(blocks: AssistantBlock[], event: { type: string; delta?: string; tool?: string; data?: unknown }): AssistantBlock[] {
  if (event.type === "text" && typeof event.delta === "string") {
    const last = blocks[blocks.length - 1];
    if (last?.type === "text") {
      return [...blocks.slice(0, -1), { type: "text", text: last.text + event.delta }];
    }
    return [...blocks, { type: "text", text: event.delta }];
  }
  if (event.type === "tool_result" && typeof event.tool === "string") {
    return [...blocks, { type: "tool_result", tool: event.tool, data: event.data }];
  }
  return blocks;
}

export function ChatWindow({ initialConversations }: ChatWindowProps) {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }

  async function refreshConversations() {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) setConversations(await res.json());
    } catch {
      // best-effort, no bloquea el chat
    }
  }

  function startNewConversation() {
    setMessages([]);
    setConversationId(null);
    setInput("");
    setError(null);
  }

  async function openConversation(id: string) {
    if (loading) return;
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) {
        setError("No se pudo abrir esa conversación.");
        return;
      }
      const data = (await res.json()) as { id: string; messages: ChatMessage[] };
      setMessages(
        data.messages.map((m): UiMessage =>
          m.role === "user" ? { role: "user", content: m.content } : { role: "assistant", blocks: [{ type: "text", text: m.content }] },
        ),
      );
      setConversationId(data.id);
      scrollToBottom();
    } catch {
      setError("No se pudo conectar con el servidor.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: UiMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...nextMessages, { role: "assistant", blocks: [] }]);
    setInput("");
    setLoading(true);
    setError(null);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: toApiMessages(nextMessages), conversationId }),
      });

      if (!res.ok || !res.body) {
        setError(await res.text().catch(() => "Error desconocido."));
        setLoading(false);
        return;
      }

      const returnedId = res.headers.get("X-Conversation-Id");
      const isNewConversation = returnedId && returnedId !== conversationId;
      if (returnedId) setConversationId(returnedId);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let blocks: AssistantBlock[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // última línea puede venir incompleta

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            blocks = applyStreamEvent(blocks, event);
          } catch {
            // línea corrupta/parcial — la ignoramos en vez de romper el chat
          }
        }

        setMessages([...nextMessages, { role: "assistant", blocks }]);
        scrollToBottom();
      }

      if (isNewConversation) await refreshConversations();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 16, height: "70vh" }}>
      <div
        style={{
          width: 200,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          overflowY: "auto",
        }}
      >
        <button
          type="button"
          onClick={startNewConversation}
          style={{
            background: "var(--accent)",
            color: "var(--on-accent)",
            fontWeight: 700,
            fontSize: 13,
            border: "none",
            borderRadius: 10,
            padding: "10px 12px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          + Nueva conversación
        </button>
        {conversations.length === 0 && (
          <p style={{ color: "var(--muted)", fontSize: 12, margin: "4px 2px" }}>
            Sin conversaciones guardadas todavía.
          </p>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => openConversation(c.id)}
            style={{
              background: c.id === conversationId ? "var(--surface-2)" : "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "9px 11px",
              fontSize: 12.5,
              color: "var(--text)",
              textAlign: "left",
              cursor: "pointer",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {c.title || "Sin título"}
          </button>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          minWidth: 0,
        }}
      >
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {messages.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>
              Pedime cosas como &quot;analizame un masajeador cervical para
              Argentina&quot; o &quot;buscame 5 productos de hogar en
              crecimiento&quot;.
            </p>
          )}
          {messages.map((m, i) => {
            if (m.role === "user") {
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: "flex-end",
                    maxWidth: "85%",
                    background: "var(--accent)",
                    color: "var(--on-accent)",
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: 14,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.content}
                </div>
              );
            }

            const isEmpty = m.blocks.length === 0;
            const isLast = i === messages.length - 1;
            return (
              <div
                key={i}
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "85%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {isEmpty && loading && isLast && (
                  <div
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "10px 14px",
                      color: "var(--muted)",
                      fontSize: 14,
                    }}
                  >
                    …
                  </div>
                )}
                {m.blocks.map((block, j) =>
                  block.type === "text" ? (
                    <div
                      key={j}
                      className="chat-markdown"
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: "10px 14px",
                        color: "var(--text)",
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <ToolResultCard key={j} tool={block.tool} data={block.data} />
                  ),
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <p style={{ color: "var(--accent-red)", fontSize: 12.5, margin: "0 16px 8px" }}>{error}</p>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: 8,
            padding: 14,
            borderTop: "1px solid var(--border)",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí tu consulta…"
            disabled={loading}
            style={{
              flex: 1,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "11px 14px",
              color: "var(--text)",
              fontSize: 14.5,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              background: loading ? "var(--surface-2)" : "var(--accent)",
              color: loading ? "var(--muted)" : "var(--on-accent)",
              fontWeight: 700,
              fontSize: 14,
              border: "none",
              borderRadius: 10,
              padding: "0 18px",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "…" : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
