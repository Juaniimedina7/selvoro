import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { listConversations } from "@/lib/conversations/queries";

export default async function ChatHistoryPage() {
  const { userId } = await auth();
  let conversations: Awaited<ReturnType<typeof listConversations>> = [];
  let loadError = false;
  try {
    conversations = await listConversations(userId!);
  } catch (e) {
    console.error("[dashboard/chat/history] listConversations falló:", e);
    loadError = true;
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 6px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Historial de chats</h1>
        <Link href="/dashboard/chat" className="s-btn s-btn--ghost" style={{ marginLeft: "auto", padding: "8px 14px", fontSize: 13 }}>
          ← Volver al chat
        </Link>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 20px" }}>
        Todas tus conversaciones con el agente. El chat solo muestra las últimas 5 en la barra
        lateral.
      </p>

      {loadError ? (
        <p style={{ color: "var(--accent-red)", fontSize: 13.5 }}>
          No se pudo cargar el historial ahora mismo. Probá de nuevo en un rato.
        </p>
      ) : conversations.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Todavía no tenés conversaciones guardadas.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/chat?open=${c.id}`}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                textDecoration: "none",
                color: "var(--text)",
              }}
            >
              <span
                style={{
                  fontSize: 13.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {c.title || "Sin título"}
              </span>
              <span style={{ fontSize: 12.5, color: "var(--muted)", flexShrink: 0 }}>
                {new Date(c.updatedAt).toLocaleDateString("es-AR")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
