import type { TrendsData } from "@/lib/types";
import { TrendSparkline } from "./TrendSparkline";

// Shape real de lo que devuelve la tool get_search_trend
// (src/lib/agent/tools.ts) — es TrendsData tal cual, sin envolver.
function isTrendsData(data: unknown): data is TrendsData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return typeof d.available === "boolean" && typeof d.ar === "object" && typeof d.us === "object";
}

export function TrendChartCard({ data }: { data: unknown }) {
  if (!isTrendsData(data)) return null;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: 16,
        maxWidth: 420,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
        Evolución del interés de búsqueda
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15.5, marginTop: 2, marginBottom: 12 }}>
        Google Trends
      </div>

      {!data.available || (data.ar.points.length === 0 && data.us.points.length === 0) ? (
        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>
          {data.note ??
            "Google Trends no devolvió datos ahora — es una fuente no oficial y a veces da rate limit. Probá de nuevo en un rato."}
        </p>
      ) : (
        <>
          <TrendSparkline ar={data.ar} us={data.us} />
          <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
            Interés de búsqueda relativo (0-100, no es volumen absoluto ni ventas). Fuente no oficial y frágil —
            usalo como proxy de atención/demanda, no como métrica exacta.
          </p>
        </>
      )}
    </div>
  );
}
