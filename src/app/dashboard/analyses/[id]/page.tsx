import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getAgentRun } from "@/lib/agentRuns/queries";

const KIND_LABEL: Record<string, string> = {
  ANALYZE: "Análisis (analyze_product)",
  COMPARE: "Comparación AR/US (compare_markets)",
  SEARCH: "Búsqueda (search_products)",
};

export default async function AgentAnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  const run = await getAgentRun(userId!, id);
  if (!run) notFound();

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>{run.query}</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 20px" }}>
        {KIND_LABEL[run.kind] ?? run.kind} · fuente {run.source.toLowerCase()} ·{" "}
        {new Date(run.createdAt).toLocaleString("es-AR")}
      </p>

      <div className="s-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 13.5 }}>
          {run.market && (
            <div>
              <div style={{ color: "var(--muted)", fontSize: 11.5, textTransform: "uppercase" }}>Mercado</div>
              <div style={{ fontWeight: 700 }}>{run.market}</div>
            </div>
          )}
          {run.verdict && (
            <div>
              <div style={{ color: "var(--muted)", fontSize: 11.5, textTransform: "uppercase" }}>Veredicto</div>
              <div style={{ fontWeight: 700 }}>{run.verdict}</div>
            </div>
          )}
          {run.confidence && (
            <div>
              <div style={{ color: "var(--muted)", fontSize: 11.5, textTransform: "uppercase" }}>Confianza</div>
              <div style={{ fontWeight: 700 }}>{run.confidence}</div>
            </div>
          )}
          {run.compositeScore != null && (
            <div>
              <div style={{ color: "var(--muted)", fontSize: 11.5, textTransform: "uppercase" }}>Score</div>
              <div style={{ fontWeight: 700 }}>{run.compositeScore}</div>
            </div>
          )}
        </div>
      </div>

      <div className="s-card">
        <pre
          style={{
            margin: 0,
            fontSize: 12,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {JSON.stringify(run.payload, null, 2)}
        </pre>
      </div>
    </>
  );
}
