import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { AnalyzeForm } from "@/components/AnalyzeForm";

export default async function Home() {
  const { userId } = await auth();

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

      {userId ? (
        <AnalyzeForm />
      ) : (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 28,
            textAlign: "center",
          }}
        >
          <p style={{ color: "var(--text)", fontSize: 15, margin: "0 0 18px", lineHeight: 1.6 }}>
            Creá una cuenta para analizar productos: cada análisis consulta Mercado
            Libre, Google Trends y Meta Ad Library, y consume 1 crédito de tu plan.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/sign-up"
              style={{
                background: "var(--accent)",
                color: "#0b0d10",
                fontWeight: 700,
                fontSize: 14,
                borderRadius: 10,
                padding: "11px 20px",
                textDecoration: "none",
              }}
            >
              Crear cuenta
            </Link>
            <Link
              href="/pricing"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontWeight: 700,
                fontSize: 14,
                borderRadius: 10,
                padding: "11px 20px",
                textDecoration: "none",
              }}
            >
              Ver planes
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
