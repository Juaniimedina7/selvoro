"use client";

import { useState } from "react";
import type { CredentialField } from "@/lib/credentials/providers";

export interface IntegrationCardProps {
  providerId: string;
  label: string;
  description: string;
  helpUrl: string;
  fields: CredentialField[];
  configured: boolean;
  maskedPreview: string | null;
  onSaved: () => void;
}

export function IntegrationCard({
  providerId,
  label,
  description,
  helpUrl,
  fields,
  configured,
  maskedPreview,
  onSaved,
}: IntegrationCardProps) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, value: values }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar.");
        setLoading(false);
        return;
      }
      setEditing(false);
      setValues({});
      onSaved();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings/credentials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "No se pudo eliminar.");
        setLoading(false);
        return;
      }
      onSaved();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{label}</div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0 0", lineHeight: 1.5 }}>
            {description}{" "}
            <a href={helpUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
              Más info
            </a>
          </p>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            color: configured ? "var(--accent)" : "var(--muted)",
            whiteSpace: "nowrap",
          }}
        >
          {configured ? "Configurada" : "Sin configurar"}
        </span>
      </div>

      {configured && !editing && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--muted)", fontFamily: "monospace" }}>{maskedPreview}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setEditing(true)} style={secondaryBtn}>
              Actualizar
            </button>
            <button onClick={handleDelete} disabled={loading} style={dangerBtn}>
              {loading ? "…" : "Eliminar"}
            </button>
          </div>
        </div>
      )}

      {(!configured || editing) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fields.map((f) => (
            <label key={f.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{f.label}</span>
              <input
                type="password"
                value={values[f.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "9px 12px",
                  color: "var(--text)",
                  fontSize: 13.5,
                  outline: "none",
                }}
              />
            </label>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button onClick={handleSave} disabled={loading} style={primaryBtn}>
              {loading ? "Validando…" : "Probar y guardar"}
            </button>
            {editing && (
              <button onClick={() => setEditing(false)} disabled={loading} style={secondaryBtn}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p style={{ color: "var(--accent-red)", fontSize: 12.5, margin: 0 }}>{error}</p>}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: "var(--accent)",
  color: "#0b0d10",
  fontWeight: 700,
  fontSize: 13,
  border: "none",
  borderRadius: 8,
  padding: "8px 14px",
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--muted)",
  fontSize: 12.5,
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--accent-red)",
  color: "var(--accent-red)",
  fontSize: 12.5,
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
};
