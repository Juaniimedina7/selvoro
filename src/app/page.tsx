"use client";

import { useState } from "react";
import { ReportView } from "@/components/ReportView";
import type { Report } from "@/lib/types";

export default function Home() {
  const [query, setQuery] = useState("");
  const [ticket, setTicket] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          ticketUsd: ticket ? Number(ticket) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error desconocido.");
      } else {
        setReport(data as Report);
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "48px 20px 80px",
      }}
    >
      <header style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 700,
          }}
        >
          Selvoro
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: "10px 0 6px", lineHeight: 1.2 }}>
          ¿Ese producto vale la pena testear en Argentina?
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, margin: 0 }}>
          Selvoro junta señales de mercado y te da una recomendación explicable:
          testear, investigar o descartar.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            Producto (nombre o URL de AliExpress/tienda)
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: proyector portátil, masajeador cervical, botella térmica..."
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            Ticket objetivo en USD (opcional)
          </span>
          <input
            value={ticket}
            onChange={(e) => setTicket(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="Ej: 45"
            inputMode="decimal"
            style={{ ...inputStyle, maxWidth: 160 }}
          />
        </label>

        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          style={{
            marginTop: 4,
            background: loading ? "var(--surface-2)" : "var(--accent)",
            color: loading ? "var(--muted)" : "#0b0d10",
            fontWeight: 700,
            fontSize: 15,
            border: "none",
            borderRadius: 10,
            padding: "12px 18px",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Analizando… (10-30s)" : "Analizar producto"}
        </button>
      </form>

      {error && (
        <p
          style={{
            marginTop: 20,
            color: "var(--accent-red)",
            background: "var(--surface-2)",
            border: "1px solid var(--accent-red)",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13.5,
          }}
        >
          {error}
        </p>
      )}

      {loading && (
        <p style={{ marginTop: 24, color: "var(--muted)", textAlign: "center", fontSize: 14 }}>
          Consultando Mercado Libre y Google Trends, calculando el scoring y
          redactando el reporte con IA…
        </p>
      )}

      {report && <ReportView report={report} />}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "11px 14px",
  color: "var(--text)",
  fontSize: 15,
  outline: "none",
};
