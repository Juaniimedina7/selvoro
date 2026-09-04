// Gráfico de línea a mano con SVG — sin librería de charting (no hay
// ninguna instalada en el proyecto y el volumen de puntos es chico, ~12-52).
// Puramente presentacional: recibe series ya armadas por el collector de
// Google Trends (src/lib/collectors/trends.ts) y solo dibuja.

interface TrendSeries {
  points: number[];
  labels: string[];
}

const WIDTH = 300;
const HEIGHT = 90;
const PAD_X = 4;

function toPath(series: TrendSeries): string {
  const n = series.points.length;
  if (n === 0) return "";
  if (n === 1) {
    const y = HEIGHT - (series.points[0] / 100) * HEIGHT;
    return `M ${PAD_X} ${y} L ${WIDTH - PAD_X} ${y}`;
  }
  const step = (WIDTH - PAD_X * 2) / (n - 1);
  return series.points
    .map((v, i) => {
      const x = PAD_X + i * step;
      const y = HEIGHT - (v / 100) * HEIGHT;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function TrendSparkline({ ar, us }: { ar: TrendSeries; us: TrendSeries }) {
  const labels = ar.labels.length ? ar.labels : us.labels;
  const first = labels[0];
  const mid = labels[Math.floor(labels.length / 2)];
  const last = labels[labels.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        preserveAspectRatio="none"
        role="img"
        aria-label="Evolución del interés de búsqueda"
      >
        {us.points.length > 0 && (
          <path
            d={toPath(us)}
            fill="none"
            stroke="var(--muted)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {ar.points.length > 0 && (
          <path
            d={toPath(ar)}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {labels.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10.5,
            color: "var(--muted)",
            marginTop: 2,
          }}
        >
          <span>{first}</span>
          {labels.length > 2 && <span>{mid}</span>}
          <span>{last}</span>
        </div>
      )}
      <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11.5, color: "var(--muted)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 12, height: 2, background: "var(--accent)", display: "inline-block" }} />
          Local
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 12,
              height: 0,
              borderTop: "1.5px dashed var(--muted)",
              display: "inline-block",
            }}
          />
          US (referencia)
        </span>
      </div>
    </div>
  );
}
