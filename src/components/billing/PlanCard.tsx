"use client";

import { useState } from "react";
import Link from "next/link";
import type { PlanConfig } from "@/lib/billing/plans";

export function PlanCard({
  plan,
  highlighted,
  isSignedIn,
  isCurrentPlan,
}: {
  plan: PlanConfig;
  highlighted?: boolean;
  isSignedIn: boolean;
  isCurrentPlan?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: plan.code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo iniciar la suscripción.");
        setLoading(false);
        return;
      }
      window.location.href = data.initPoint;
    } catch {
      setError("No se pudo conectar con el servidor.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${highlighted ? "var(--accent)" : "var(--border)"}`,
        borderRadius: 14,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div>
        <div style={{ fontSize: 13, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
          {plan.name}
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, marginTop: 6 }}>
          ${plan.priceArs.toLocaleString("es-AR")}
          <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 500 }}> ARS/mes</span>
        </div>
        <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 4 }}>
          {plan.monthlyCredits} análisis por mes
        </div>
      </div>

      {isCurrentPlan ? (
        <div
          style={{
            textAlign: "center",
            fontSize: 13.5,
            fontWeight: 700,
            color: "var(--accent)",
            padding: "11px 0",
          }}
        >
          Tu plan actual
        </div>
      ) : isSignedIn ? (
        <button
          onClick={handleSubscribe}
          disabled={loading}
          style={{
            textAlign: "center",
            background: highlighted ? "var(--accent)" : "var(--surface-2)",
            border: highlighted ? "none" : "1px solid var(--border)",
            color: highlighted ? "var(--on-accent)" : "var(--text)",
            fontWeight: 700,
            fontSize: 14,
            borderRadius: 10,
            padding: "11px 0",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Redirigiendo…" : "Suscribirme"}
        </button>
      ) : (
        <Link
          href="/sign-up"
          style={{
            textAlign: "center",
            background: highlighted ? "var(--accent)" : "var(--surface-2)",
            border: highlighted ? "none" : "1px solid var(--border)",
            color: highlighted ? "var(--on-accent)" : "var(--text)",
            fontWeight: 700,
            fontSize: 14,
            borderRadius: 10,
            padding: "11px 0",
            textDecoration: "none",
          }}
        >
          Crear cuenta para suscribirme
        </Link>
      )}

      {error && (
        <p style={{ color: "var(--accent-red)", fontSize: 12.5, margin: 0 }}>{error}</p>
      )}
    </div>
  );
}
