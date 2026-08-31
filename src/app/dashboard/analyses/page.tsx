import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { listAgentRuns } from "@/lib/agentRuns/queries";

const KIND_LABEL: Record<string, string> = {
  ANALYZE: "Análisis",
  COMPARE: "Comparación AR/US",
  SEARCH: "Búsqueda",
};

const VERDICT_LABEL: Record<string, string> = {
  testear: "🟢 Testear",
  investigar: "🟡 Investigar",
  descartar: "🔴 Descartar",
};

export default async function AgentAnalysesPage() {
  const { userId } = await auth();
  const runs = await listAgentRuns(userId!);

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Análisis y búsquedas (agente)</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 20px" }}>
        Historial de analyze_product, compare_markets y search_products corridos desde el chat o el MCP.
      </p>

      {runs.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Todavía no hay análisis guardados desde el chat/MCP.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {runs.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/analyses/${r.id}`}
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
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span className="s-tag s-tag--byok" style={{ flexShrink: 0 }}>
                  {KIND_LABEL[r.kind] ?? r.kind}
                </span>
                <span
                  style={{
                    fontSize: 13.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.query}
                </span>
              </span>
              <span style={{ fontSize: 12.5, color: "var(--muted)", flexShrink: 0 }}>
                {r.verdict ? `${VERDICT_LABEL[r.verdict] ?? r.verdict} · ` : ""}
                {new Date(r.createdAt).toLocaleDateString("es-AR")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
