import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getCurrentRole, roleHasCreditBypass } from "@/lib/auth/roles";
import { getActiveSubscription } from "@/lib/billing/subscriptions";
import { listReports } from "@/lib/reports/queries";
import { listAgentRuns } from "@/lib/agentRuns/queries";
import { CancelSubscriptionButton } from "@/components/billing/CancelSubscriptionButton";

const VERDICT_LABEL: Record<string, string> = {
  testear: "🟢 Testear",
  investigar: "🟡 Investigar",
  descartar: "🔴 Descartar",
};

const AGENT_KIND_LABEL: Record<string, string> = {
  ANALYZE: "Análisis",
  COMPARE: "Comparación AR/US",
  SEARCH: "Búsqueda",
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  socio: "Socio",
  member: "Miembro",
};

export default async function DashboardPage() {
  const { userId } = await auth();
  const [role, sub, reports] = await Promise.all([
    getCurrentRole(),
    getActiveSubscription(userId!),
    listReports(userId!),
  ]);
  const bypass = roleHasCreditBypass(role);

  // Aislado del Promise.all de arriba a propósito: si esta tabla nueva falla
  // (ej. la DB de producción todavía no tiene la migración), no debe tirar
  // abajo el resto de "Mi cuenta" (plan, créditos, reportes).
  let agentRuns: Awaited<ReturnType<typeof listAgentRuns>> = [];
  try {
    agentRuns = await listAgentRuns(userId!);
  } catch (e) {
    console.error("[dashboard] listAgentRuns falló:", e);
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "0 0 24px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Mi cuenta</h1>
        <span className="s-tag s-tag--byok">{ROLE_LABEL[role]}</span>
        {bypass && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)" }}>
            créditos ilimitados
          </span>
        )}
        {role === "admin" && (
          <Link href="/admin" className="s-btn s-btn--ghost" style={{ marginLeft: "auto", padding: "8px 14px", fontSize: 13 }}>
            Panel interno
          </Link>
        )}
      </div>

      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 20,
          marginBottom: 28,
        }}
      >
        {!sub ? (
          <div>
            <p style={{ margin: "0 0 12px", fontSize: 14.5 }}>No tenés un plan activo.</p>
            <Link
              href="/pricing"
              style={{
                background: "var(--accent)",
                color: "var(--on-accent)",
                fontWeight: 700,
                fontSize: 14,
                borderRadius: 10,
                padding: "10px 16px",
                textDecoration: "none",
              }}
            >
              Ver planes
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>
                Plan actual
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>{sub.plan.name}</div>
              {sub.status === "PAST_DUE" && (
                <p style={{ color: "var(--accent-red)", fontSize: 12.5, marginTop: 6 }}>
                  Tu último pago no se pudo procesar. Los análisis están bloqueados hasta que se
                  regularice.
                </p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>Créditos restantes</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent)" }}>
                {sub.creditsRemaining}
                <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>
                  {" "}
                  / {sub.plan.monthlyCredits}
                </span>
              </div>
            </div>
            <div style={{ width: "100%" }}>
              <CancelSubscriptionButton />
            </div>
          </div>
        )}
      </section>

      <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 12px" }}>Historial de reportes</h2>
      {reports.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Todavía no analizaste ningún producto.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/reports/${r.id}`}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                textDecoration: "none",
                color: "var(--text)",
              }}
            >
              <span style={{ fontSize: 13.5 }}>{r.query}</span>
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {VERDICT_LABEL[r.verdict] ?? r.verdict} ·{" "}
                {new Date(r.createdAt).toLocaleDateString("es-AR")}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "28px 0 12px" }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Historial de análisis (chat/MCP)</h2>
        {agentRuns.length > 10 && (
          <Link href="/dashboard/analyses" style={{ fontSize: 12.5, color: "var(--accent)" }}>
            ver todos
          </Link>
        )}
      </div>
      {agentRuns.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Todavía no corriste ningún análisis desde el chat o el MCP.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {agentRuns.slice(0, 10).map((r) => (
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
                  {AGENT_KIND_LABEL[r.kind] ?? r.kind}
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
