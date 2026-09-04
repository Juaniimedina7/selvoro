"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ToolResultCard } from "./cards/ToolResultCard";

const SIDEBAR_LIMIT = 5;

// Texto amigable para el indicador "corriendo tool" — se muestra entre el
// evento tool_start y el tool_result, que en algunas tools (Apify,
// search_products) puede tardar bastante y sin esto la UI no muestra nada
// mientras tanto.
const TOOL_LABELS: Record<string, string> = {
  analyze_product: "Analizando el producto…",
  compare_markets: "Comparando mercados…",
  search_products: "Generando y validando ideas de productos…",
  generate_test_brief: "Armando el brief de testeo…",
  meta_ads_snapshot: "Consultando Meta Ads Library…",
  get_search_trend: "Consultando Google Trends…",
  search_marketplace_products: "Buscando en el marketplace (puede tardar hasta un minuto)…",
  scrape_competitor_page: "Leyendo la página del competidor…",
  tienda_nube_snapshot: "Consultando tu tienda de Tienda Nube…",
  mercadolibre_seller_snapshot: "Consultando tu cuenta de Mercado Libre…",
  lookup_tech_stack: "Detectando la tecnología del sitio…",
  list_reports: "Buscando tus reportes…",
  get_report: "Abriendo el reporte…",
  list_sources: "Revisando el estado de las fuentes…",
  list_analyses: "Buscando tus análisis…",
  get_analysis: "Abriendo el análisis…",
};

function toolLabel(tool: string): string {
  return TOOL_LABELS[tool] ?? `Ejecutando ${tool}…`;
}

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
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Nombre de la tool corriendo en este momento (entre tool_start y
  // tool_result), null si no hay ninguna en vuelo — controla el indicador
  // de espera con label.
  const [pendingTool, setPendingTool] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Viene de /dashboard/chat/history al hacer click en una conversación
  // vieja que no entra en las últimas 5 del sidebar.
  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) openConversation(openId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
    setPendingTool(null);
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
      let pending: string | null = null;

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
            if (event.type === "tool_start" && typeof event.tool === "string") {
              pending = event.tool;
            } else {
              if (event.type === "tool_result" || event.type === "text") pending = null;
              blocks = applyStreamEvent(blocks, event);
            }
          } catch {
            // línea corrupta/parcial — la ignoramos en vez de romper el chat
          }
        }

        setPendingTool(pending);
        setMessages([...nextMessages, { role: "assistant", blocks }]);
        scrollToBottom();
      }

      // El stream terminó con una tool todavía en vuelo: no es un final
      // normal (el modelo siempre sigue con texto o el tool_result después
      // de una tool_start). Suele pasar cuando la función serverless se
      // corta por timeout duro a mitad de una tool lenta (Apify, etc.) —
      // sin esto el chat queda "tildado" sin ningún aviso.
      if (pending) {
        setError(
          `La respuesta se cortó mientras corría "${toolLabel(pending)}" — puede pasar con búsquedas que tardan mucho (por ejemplo, Alibaba/AliExpress vía Apify). Probá de nuevo o con una consulta más simple.`,
        );
      }

      if (isNewConversation) await refreshConversations();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
      setPendingTool(null);
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
        {conversations.slice(0, SIDEBAR_LIMIT).map((c) => (
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
        {conversations.length > SIDEBAR_LIMIT && (
          <Link
            href="/dashboard/chat/history"
            style={{
              fontSize: 12,
              color: "var(--accent)",
              textAlign: "left",
              padding: "4px 2px",
              textDecoration: "none",
            }}
          >
            Ver historial completo →
          </Link>
        )}
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
                {loading && isLast && pendingTool && (
                  <div
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      color: "var(--muted)",
                      fontSize: 13.5,
                    }}
                  >
                    <span className="chat-pulse-dot" />
                    {toolLabel(pendingTool)}
                  </div>
                )}
                {isEmpty && loading && isLast && !pendingTool && (
                  <div
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      width: 160,
                    }}
                  >
                    <div className="chat-skeleton-bar" style={{ width: "90%" }} />
                    <div className="chat-skeleton-bar" style={{ width: "60%" }} />
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
