import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { AnalyzeForm } from "@/components/AnalyzeForm";

const DATA_SOURCES = [
  { label: "Mercado Libre", tag: "pública", desc: "Precios, competidores y volumen de publicaciones en tiempo real." },
  { label: "Google Trends", tag: "pública", desc: "Tendencia de búsqueda comparada entre Argentina y Estados Unidos." },
  { label: "Meta Ad Library", tag: "pública", desc: "Anuncios activos, antigüedad y cantidad de anunciantes distintos." },
  { label: "Tienda Nube", tag: "tu cuenta", desc: "Productos y pedidos reales de tu propia tienda, no proxies." },
  { label: "Mercado Libre vendedor", tag: "tu cuenta", desc: "Tus publicaciones activas reales, distinto de la búsqueda pública." },
  { label: "BuiltWith", tag: "pública", desc: "El stack tecnológico de la tienda de un competidor puntual." },
];

const TOOLS = [
  { label: "Analizar un producto", desc: "Score de 9 dimensiones con la evidencia real detrás de cada número." },
  { label: "Comparar AR vs US", desc: "Tendencia de búsqueda y anuncios activos, los dos mercados lado a lado." },
  { label: "Descubrir candidatos", desc: "IA para brainstormear ideas + collectors reales que validan cada una." },
  { label: "Brief de testeo", desc: "Ángulos, hooks, público y plan de la primera semana desde un reporte." },
  { label: "Chat conversacional", desc: "Le pedís en lenguaje natural y el agente elige qué herramienta usar." },
  { label: "Servidor MCP", desc: "Conectá Claude Desktop u otro cliente MCP directo a tu cuenta." },
];

const STEPS = [
  { n: "01", t: "Ingresás el producto", d: "Un nombre, un nicho o una URL de AliExpress o de una tienda. Nada más." },
  { n: "02", t: "Selvoro consulta las fuentes", d: "Cruza marketplaces, tendencias y anuncios activos, y arma un score explicable — dimensión por dimensión." },
  { n: "03", t: "Recibís un veredicto", d: "Testear, investigar o descartar, con la evidencia y el nivel de confianza detrás de cada señal." },
];

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    return (
      <main className="s-wrap" style={{ maxWidth: 860, paddingBlock: "48px 80px" }}>
        <header style={{ textAlign: "center", marginBottom: 32 }}>
          <p className="s-eyebrow">Nuevo análisis</p>
          <h1 className="s-display" style={{ fontSize: 30, margin: "10px 0 6px" }}>
            ¿Vale la pena testear ese producto en Argentina?
          </h1>
          <p className="s-lead" style={{ fontSize: 15 }}>
            Ingresá un producto y Selvoro te devuelve un veredicto explicable.
          </p>
        </header>
        <AnalyzeForm />
      </main>
    );
  }

  return (
    <main>
      {/* ===================== HERO (promesa) ===================== */}
      <section className="s-wrap s-section" style={{ paddingTop: 72 }}>
        <div
          className="s-grid s-grid--2"
          style={{ gap: 56, alignItems: "center" }}
        >
          <div>
            <p className="s-eyebrow s-rise">Inteligencia de producto · Argentina</p>
            <h1
              className="s-display s-rise s-rise-2"
              style={{ fontSize: "clamp(36px, 5.2vw, 60px)", margin: "16px 0 20px" }}
            >
              Sabé si un producto se puede testear{" "}
              <span style={{ color: "var(--accent)" }}>antes</span> de gastar un
              peso en ads.
            </h1>
            <p className="s-lead s-rise s-rise-3" style={{ maxWidth: 520 }}>
              Selvoro es tu analista de mercado para e-commerce. Junta señales
              públicas reales, las combina en un score explicable y te da un
              veredicto claro: <strong style={{ color: "var(--text)" }}>testear, investigar o descartar</strong>.
            </p>
            <div
              className="s-rise s-rise-4"
              style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 30 }}
            >
              <Link href="/sign-up" className="s-btn s-btn--primary">
                Analizar mi primer producto
              </Link>
              <Link href="/pricing" className="s-btn s-btn--ghost">
                Ver planes
              </Link>
            </div>
            <p
              className="s-rise s-rise-4"
              style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", marginTop: 18 }}
            >
              Sin métricas de ventas inventadas. Cada señal, con su nivel de confianza.
            </p>
          </div>

          {/* Signature: sello de veredicto (output real del producto) */}
          <div className="verdict s-rise s-rise-3" aria-hidden>
            <div className="verdict__head">
              <span className="verdict__product">Proyector portátil 4K</span>
              <span className="verdict__meta">AR · 2 min</span>
            </div>
            <VerdictRow dim="Demanda" band="Alta" pct={78} color="var(--go)" />
            <VerdictRow dim="Saturación local" band="Media" pct={52} color="var(--caution)" />
            <VerdictRow dim="Oportunidad US↔AR" band="Alta" pct={81} color="var(--go)" />
            <VerdictRow dim="Competencia" band="Media" pct={49} color="var(--caution)" />
            <div className="verdict__stamp">
              <span className="verdict__label">
                <span className="verdict__dot" />
                Testear
              </span>
              <span className="verdict__conf">
                confianza media
                <br />
                12 anunciantes · 47 pubs en ML
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== DOLOR (el problema) ===================== */}
      <section className="s-band">
        <div className="s-wrap s-section">
          <div className="s-kicker">
            <span className="s-eyebrow" style={{ color: "var(--stop)" }}>El problema</span>
          </div>
          <div className="s-grid s-grid--2" style={{ gap: 48, alignItems: "start" }}>
            <h2 className="s-h2" style={{ maxWidth: 460 }}>
              Validar un producto hoy es un rompecabezas de seis pestañas.
            </h2>
            <div>
              <p className="s-lead" style={{ fontSize: 16 }}>
                Buscás competidores en Mercado Libre, revisás anuncios en Meta,
                chequeás Google Trends, tratás de adivinar si algo que explota
                en Estados Unidos también funciona acá — y aun así terminás
                decidiendo a ojo.
              </p>
              <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
                {[
                  "El trabajo está fragmentado en herramientas que no hablan entre sí.",
                  "Ninguna te responde lo que importa acá: ¿ya está saturado en Argentina?",
                  "Cada test a ciegas es plata quemada antes de saber si valía la pena.",
                ].map((t) => (
                  <li key={t} style={{ display: "flex", gap: 10, fontSize: 15, color: "var(--text-soft)" }}>
                    <span aria-hidden style={{ color: "var(--stop)", fontWeight: 700 }}>—</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== SOLUCIÓN (cómo funciona) ===================== */}
      <section className="s-wrap s-section">
        <div className="s-kicker">
          <span className="s-eyebrow">La solución</span>
        </div>
        <h2 className="s-h2" style={{ maxWidth: 620 }}>
          Una sola consulta. Un veredicto que podés defender.
        </h2>
        <div className="s-grid s-grid--3" style={{ marginTop: 36 }}>
          {STEPS.map((s) => (
            <div key={s.n} className="s-card">
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>
                {s.n}
              </span>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, margin: "10px 0 6px" }}>
                {s.t}
              </h3>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.55, margin: 0 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== FUENTES DE DATOS ===================== */}
      <section className="s-band">
        <div className="s-wrap s-section">
          <div className="s-kicker">
            <span className="s-eyebrow">Fuentes de datos</span>
          </div>
          <h2 className="s-h2" style={{ maxWidth: 620 }}>
            Señales públicas, más los datos que vos conectás.
          </h2>
          <div className="s-grid s-grid--3" style={{ marginTop: 36 }}>
            {DATA_SOURCES.map((s) => (
              <div key={s.label} className="s-card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 15.5, fontWeight: 700 }}>{s.label}</span>
                  <span className={`s-tag ${s.tag === "pública" ? "s-tag--public" : "s-tag--byok"}`}>{s.tag}</span>
                </div>
                <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== DIFERENCIADOR (honestidad) ===================== */}
      <section className="s-wrap s-section">
        <div
          className="s-card"
          style={{ padding: "clamp(28px, 5vw, 56px)", textAlign: "center", maxWidth: 820, margin: "0 auto", background: "var(--surface-2)" }}
        >
          <p className="s-eyebrow" style={{ display: "block", marginBottom: 16 }}>Lo que no vas a encontrar acá</p>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "clamp(21px, 3vw, 30px)", lineHeight: 1.25, letterSpacing: "-0.01em", margin: 0 }}>
            ROAS, CPA ni ventas “reales” de la competencia. Eso no es público —
            y quien te lo promete, te lo inventa.
          </p>
          <p className="s-lead" style={{ marginTop: 18, maxWidth: 560, marginInline: "auto", fontSize: 16 }}>
            Selvoro trabaja con señales observables y proxies, y te dice el nivel
            de confianza de cada una. Cuando una fuente no está disponible, lo
            dice — no rellena con un número lindo.
          </p>
        </div>
      </section>

      {/* ===================== CAPACIDADES ===================== */}
      <section className="s-band">
        <div className="s-wrap s-section">
          <div className="s-kicker">
            <span className="s-eyebrow">Qué podés hacer</span>
          </div>
          <div className="s-grid s-grid--3">
            {TOOLS.map((t) => (
              <div key={t.label} className="s-card">
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>{t.label}</h3>
                <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55, margin: 0 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CTA FINAL ===================== */}
      <section className="s-wrap s-section" style={{ textAlign: "center" }}>
        <h2 className="s-h2" style={{ maxWidth: 640, margin: "0 auto 16px" }}>
          Dejá de adivinar. Empezá a decidir con evidencia.
        </h2>
        <p className="s-lead" style={{ maxWidth: 520, margin: "0 auto 28px" }}>
          Creá tu cuenta y analizá tu primer producto en minutos.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/sign-up" className="s-btn s-btn--primary">Crear cuenta gratis</Link>
          <Link href="/pricing" className="s-btn s-btn--ghost">Ver planes</Link>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="s-wrap" style={{ paddingBlock: 28, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
            <Image src="/logo-mark.png" alt="" width={24} height={24} style={{ display: "block" }} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}>Selvoro</span>
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
            Inteligencia de producto para vender en Argentina.
          </span>
        </div>
      </footer>
    </main>
  );
}

function VerdictRow({
  dim,
  band,
  pct,
  color,
}: {
  dim: string;
  band: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="verdict__row">
      <span className="verdict__dim">{dim}</span>
      <span className="verdict__bar">
        <span style={{ width: `${pct}%`, background: color }} />
      </span>
      <span className="verdict__band">{band}</span>
    </div>
  );
}
