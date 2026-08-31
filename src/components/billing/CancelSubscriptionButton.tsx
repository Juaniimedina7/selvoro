"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo cancelar.");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        style={{
          background: "transparent",
          border: "1px solid var(--border)",
          color: "var(--muted)",
          fontSize: 12.5,
          borderRadius: 8,
          padding: "8px 12px",
          cursor: "pointer",
        }}
      >
        Cancelar suscripción
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>
        El acceso se corta de inmediato al cancelar (Mercado Pago no permite
        cancelar recién al fin del período). ¿Confirmás?
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleCancel}
          disabled={loading}
          style={{
            background: "var(--accent-red)",
            border: "none",
            color: "var(--on-accent)",
            fontWeight: 700,
            fontSize: 12.5,
            borderRadius: 8,
            padding: "8px 12px",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Cancelando…" : "Sí, cancelar"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--muted)",
            fontSize: 12.5,
            borderRadius: 8,
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Volver
        </button>
      </div>
      {error && <p style={{ color: "var(--accent-red)", fontSize: 12, margin: 0 }}>{error}</p>}
    </div>
  );
}
