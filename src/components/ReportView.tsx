import type { Report, Verdict } from "@/lib/types";
import { ScoreCard } from "./ScoreCard";

const VERDICT_META: Record<Verdict, { label: string; color: string; emoji: string }> = {
  testear: { label: "Testear", color: "var(--accent)", emoji: "🟢" },
  investigar: { label: "Investigar más", color: "var(--accent-amber)", emoji: "🟡" },
  descartar: { label: "Descartar", color: "var(--accent-red)", emoji: "🔴" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px", color: "var(--text)" }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items?.length)
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>Sin datos.</p>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((it, i) => (
        <li key={i} style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--text)" }}>
          {it}
        </li>
      ))}
    </ul>
  );
}

export function ReportView({ report }: { report: Report }) {
  const v = VERDICT_META[report.recommendation.verdict];

  return (
    <div style={{ marginTop: 32 }}>
      {/* Recomendación */}
      <div
        style={{
          background: "var(--surface)",
          border: `1px solid ${v.color}`,
          borderRadius: 14,
          padding: 20,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
            Recomendación
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: v.color, marginTop: 4 }}>
            {v.emoji} {v.label}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Score compuesto</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {report.score.compositeBand.toUpperCase()}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            Confianza global: {report.score.globalConfidence}
          </div>
        </div>
      </div>

      {/* Nota de cobertura */}
      <p
        style={{
          marginTop: 14,
          fontSize: 12.5,
          color: "var(--muted)",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "10px 14px",
          lineHeight: 1.5,
        }}
      >
        ⚠️ {report.dataCoverageNote}
      </p>

      <Section title="Resumen ejecutivo">
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--text)" }}>
          {report.narrative.resumenEjecutivo}
        </p>
      </Section>

      <Section title="Scoring explicable">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {report.score.dimensions.map((d) => (
            <ScoreCard key={d.dimension} dim={d} />
          ))}
        </div>
      </Section>

      <div
        style={{
          marginTop: 28,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
        }}
      >
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px", color: "var(--accent)" }}>
            Señales positivas
          </h3>
          <BulletList items={report.narrative.senalesPositivas} />
        </div>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px", color: "var(--accent-red)" }}>
            Señales negativas
          </h3>
          <BulletList items={report.narrative.senalesNegativas} />
        </div>
      </div>

      <Section title="Riesgos">
        <BulletList items={report.narrative.riesgos} />
      </Section>

      <Section title="Diferenciadores posibles">
        <BulletList items={report.narrative.diferenciadores} />
      </Section>

      <Section title="Ideas de testeo">
        <BulletList items={report.narrative.ideasDeTesteo} />
      </Section>

      {/* Precio local */}
      {report.mercadoLibre.available && (
        <Section title="Precio local (Mercado Libre)">
          <div style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.7 }}>
            <div>Publicaciones: {report.mercadoLibre.totalListings ?? "—"}</div>
            <div>
              Precio: {report.mercadoLibre.priceMin ?? "—"} – {report.mercadoLibre.priceMax ?? "—"}{" "}
              {report.mercadoLibre.currency ?? ""} (mediana:{" "}
              {report.mercadoLibre.priceMedian ?? "—"})
            </div>
          </div>
        </Section>
      )}

      <Section title="Fuentes utilizadas">
        <BulletList items={report.sources} />
      </Section>

      <p style={{ marginTop: 24, fontSize: 11, color: "var(--muted)" }}>
        Generado {new Date(report.createdAt).toLocaleString("es-AR")}. Las señales son
        proxies observables, no métricas de ventas reales.
      </p>
    </div>
  );
}
