import type { DimensionScore } from "@/lib/types";

const BAND_COLOR: Record<string, string> = {
  alta: "var(--accent)",
  media: "var(--accent-amber)",
  baja: "var(--accent-red)",
};

export function ScoreCard({ dim }: { dim: DimensionScore }) {
  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{dim.label}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: BAND_COLOR[dim.band],
          }}
        >
          {dim.band}
        </span>
      </div>

      <div
        style={{
          marginTop: 8,
          height: 6,
          borderRadius: 3,
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${dim.value}%`,
            height: "100%",
            background: BAND_COLOR[dim.band],
          }}
        />
      </div>

      <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
        {dim.evidence}
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--muted)" }}>
        Peso {Math.round(dim.weight * 100)}% · Confianza: {dim.confidence}
      </p>
    </div>
  );
}
