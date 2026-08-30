import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { getActiveSubscription } from "@/lib/billing/subscriptions";
import { listReports } from "@/lib/reports/queries";
import { CancelSubscriptionButton } from "@/components/billing/CancelSubscriptionButton";

const VERDICT_LABEL: Record<string, string> = {
  testear: "🟢 Testear",
  investigar: "🟡 Investigar",
  descartar: "🔴 Descartar",
};

export default async function DashboardPage() {
  const { userId } = await auth();
  const [sub, reports] = await Promise.all([
    getActiveSubscription(userId!),
    listReports(userId!),
  ]);

  return (
    <>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 24px" }}>Mi cuenta</h1>

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
                color: "#0b0d10",
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
    </>
  );
}
