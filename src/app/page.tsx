import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { AnalyzeForm } from "@/components/AnalyzeForm";

const DATA_SOURCES = [
  {
    label: "Mercado Libre",
    tag: "pública",
    desc: "Precios, competencia y volumen de publicaciones en tiempo real.",
  },
  {
    label: "Google Trends",
    tag: "pública",
    desc: "Tendencia de búsqueda comparada entre Argentina y Estados Unidos.",
  },
  {
    label: "Meta Ad Library",
    tag: "pública",
    desc: "Anuncios activos, antigüedad y cantidad de anunciantes distintos.",
  },
  {
    label: "Tienda Nube",
    tag: "conectá tu cuenta",
    desc: "Traé productos y pedidos reales de tu propia tienda, no proxies.",
  },
  {
    label: "Mercado Libre vendedor",
    tag: "conectá tu cuenta",
    desc: "Tus publicaciones activas reales, distinto de la búsqueda pública.",
  },
  {
    label: "BuiltWith",
    tag: "pública",
    desc: "Stack tecnológico de la tienda de un competidor puntual.",
  },
];

const TOOLS = [
  {
    label: "Analizar un producto",
    desc: "Scoring explicable de 9 dimensiones con evidencia real detrás de cada número, nunca una métrica de ventas inventada.",
  },
  {
    label: "Comparar AR vs US",
    desc: "Tendencia de búsqueda y anuncios activos lado a lado entre los dos mercados.",
  },
  {
    label: "Buscar productos candidatos",
    desc: "IA para brainstormear ideas + collectors reales para validar cada una, con ranking por señal.",
  },
  {
    label: "Generar brief de testeo",
    desc: "Ángulos, hooks, público objetivo y plan de la primera semana a partir de un reporte guardado.",
  },
  {
    label: "Chat conversacional",
    desc: "Le pedís en lenguaje natural lo que necesitás y el agente elige qué herramienta usar.",
  },
  {
    label: "Servidor MCP",
    desc: "Conectá Claude Desktop, Claude.ai u otro cliente MCP directo a tu cuenta de Selvoro.",
  },
];

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    return (
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 20px 80px" }}>
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
        <AnalyzeForm />
      </main>
    );
  }

  return (
    <main>
      {/* Hero */}
      <section style={{ maxWidth: 720, margin: "0 auto", padding: "64px 20px 40px", textAlign: "center" }}>
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
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "12px 0 14px", lineHeight: 1.2 }}>
          ¿Ese producto vale la pena testear en Argentina?
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.6, margin: "0 0 28px" }}>
          Selvoro es un analista de inteligencia de mercado para e-commerce en
          Argentina/LATAM. Junta señales públicas reales, las combina en un
          scoring explicable, y te da una recomendación honesta —{" "}
          <strong style={{ color: "var(--text)" }}>
            nunca una métrica de ventas o ROAS inventada.
          </strong>
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/sign-up"
            style={{
              background: "var(--accent)",
              color: "#0b0d10",
              fontWeight: 700,
              fontSize: 14.5,
              borderRadius: 10,
              padding: "12px 22px",
              textDecoration: "none",
            }}
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/pricing"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              fontWeight: 700,
              fontSize: 14.5,
              borderRadius: 10,
              padding: "12px 22px",
              textDecoration: "none",
            }}
          >
            Ver planes
          </Link>
        </div>
      </section>

      {/* Qué es Selvoro */}
      <section
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "12px 20px 56px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--text)", fontSize: 14.5, lineHeight: 1.7, margin: 0 }}>
          Antes de invertir en publicidad, la mayoría de los vendedores arma un
          análisis manual: busca competidores, revisa precios, mira si ya hay
          anuncios corriendo, y trata de adivinar si un producto que funciona
          en otro mercado también va a funcionar acá. Selvoro automatiza esa
          investigación con datos reales — y cuando una fuente no está
          disponible, lo dice explícitamente en vez de inventar un número.
        </p>
      </section>

      {/* Fuentes de datos */}
      <section style={{ background: "var(--surface)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 20px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
            Fuentes de datos
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", margin: "0 0 36px" }}>
            Combina señales públicas con datos que vos mismo conectás desde tu cuenta.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {DATA_SOURCES.map((s) => (
              <div
                key={s.label}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700 }}>{s.label}</span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: s.tag === "pública" ? "var(--muted)" : "var(--accent)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.tag}
                  </span>
                </div>
                <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Herramientas */}
      <section style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 20px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, textAlign: "center", margin: "0 0 8px" }}>
          Qué podés hacer
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 14, textAlign: "center", margin: "0 0 36px" }}>
          Desde el formulario, el chat, o conectando tu propio cliente MCP.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 16,
          }}
        >
          {TOOLS.map((t) => (
            <div
              key={t.label}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "18px 20px",
              }}
            >
              <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 8, color: "var(--accent)" }}>
                {t.label}
              </div>
              <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cierre */}
      <section style={{ borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "56px 20px 72px", textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>
            Dejá de adivinar si un producto vale la pena.
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
            Creá tu cuenta y analizá tu primer producto en minutos.
          </p>
          <Link
            href="/sign-up"
            style={{
              background: "var(--accent)",
              color: "#0b0d10",
              fontWeight: 700,
              fontSize: 14.5,
              borderRadius: 10,
              padding: "12px 24px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Crear cuenta gratis
          </Link>
        </div>
      </section>
    </main>
  );
}
