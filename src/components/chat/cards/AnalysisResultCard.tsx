import type { Confidence, DimensionScore, Verdict } from "@/lib/types";
import { ScoreCard } from "@/components/ScoreCard";

// Shape real de summarizeEvidence() en src/lib/agent/tools.ts — lo que
// analyze_product (y compare_markets, mismo helper) devuelve al chat. Viene
// del tool_result crudo emitido por /api/chat, no de algo que el LLM redactó.
export interface AnalysisSummary {
  query: string;
  verdict: Verdict;
  confidence: Confidence;
  composite: number;
  compositeBand: "alta" | "media" | "baja";
  dimensions: DimensionScore[];
  marginBreakdown?: {
    costBasisUsd: number;
    ticketUsd: number;
    grossMarginUsd: number;
    grossMarginPct: number;
  } | null;
  dataCoverageNote: string;
  sources: string[];
}

const VERDICT_META: Record<Verdict, { label: string; color: string; soft: string; emoji: string }> = {
  testear: { label: "Testear", color: "var(--go)", soft: "var(--go-soft)", emoji: "🟢" },
  investigar: { label: "Investigar más", color: "var(--caution)", soft: "var(--caution-soft)", emoji: "🟡" },
  descartar: { label: "Descartar", color: "var(--stop)", soft: "var(--stop-soft)", emoji: "🔴" },
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  alta: "Confianza alta",
  media: "Confianza media",
  baja: "Confianza baja",
};

function isAnalysisSummary(data: unknown): data is AnalysisSummary {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return typeof d.query === "string" && typeof d.composite === "number" && Array.isArray(d.dimensions);
}

export function AnalysisResultCard({ data }: { data: unknown }) {
  if (!isAnalysisSummary(data)) return null;
  const v = VERDICT_META[data.verdict];

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${v.color}`,
        borderRadius: 14,
        padding: 18,
        maxWidth: 560,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
            Reporte
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, marginTop: 2 }}>
            {data.query}
          </div>
        </div>
        <span
          style={{
            background: v.soft,
            color: v.color,
            fontWeight: 700,
            fontSize: 12.5,
            padding: "4px 10px",
            borderRadius: 999,
            whiteSpace: "nowrap",
          }}
        >
          {v.emoji} {v.label}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          marginTop: 14,
          padding: "10px 14px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
        }}
      >
        <div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: v.color }}>
            {data.composite}
          </span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>/100</span>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--muted)",
            border: "1px solid var(--border-strong)",
            borderRadius: 999,
            padding: "3px 9px",
          }}
        >
          {CONFIDENCE_LABEL[data.confidence]}
        </span>
        <span style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.4 }}>
          Compuesto de señales públicas observables — no es una probabilidad de venta.
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {data.dimensions.map((dim) => (
          <ScoreCard key={dim.dimension} dim={dim} />
        ))}
      </div>

      {data.marginBreakdown && (
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Importación vs. venta</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12.5 }}>
            <div>
              <div style={{ color: "var(--muted)" }}>Costo de origen</div>
              <div style={{ fontWeight: 700 }}>US${data.marginBreakdown.costBasisUsd}</div>
            </div>
            <div>
              <div style={{ color: "var(--muted)" }}>Ticket de venta</div>
              <div style={{ fontWeight: 700 }}>US${data.marginBreakdown.ticketUsd}</div>
            </div>
            <div>
              <div style={{ color: "var(--muted)" }}>Margen bruto</div>
              <div style={{ fontWeight: 700, color: "var(--go)" }}>
                ~{data.marginBreakdown.grossMarginPct}% (US${data.marginBreakdown.grossMarginUsd.toFixed(2)})
              </div>
            </div>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--muted)", lineHeight: 1.4 }}>
            Bruto — sin flete, aduana ni comisiones. No es rentabilidad neta.
          </p>
        </div>
      )}

      <p style={{ marginTop: 14, fontSize: 11.5, color: "var(--muted)", lineHeight: 1.45 }}>
        ⚠️ {data.dataCoverageNote}
      </p>

      {data.sources?.length > 0 && (
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--muted)" }}>
          Fuentes: {data.sources.join(" · ")}
        </p>
      )}
    </div>
  );
}
