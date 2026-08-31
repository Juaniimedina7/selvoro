import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main
      style={{
        minHeight: "calc(100vh - 62px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: "48px 20px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <p className="s-eyebrow">Empezá gratis</p>
        <h1 className="s-display" style={{ fontSize: 28, margin: "10px 0 6px" }}>
          Creá tu cuenta de Selvoro
        </h1>
        <p className="s-lead" style={{ fontSize: 15 }}>
          Analizá tu primer producto en minutos, con evidencia real detrás.
        </p>
      </div>

      <SignUp signInUrl="/sign-in" />

      <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
        ¿Ya tenés cuenta?{" "}
        <Link href="/sign-in" style={{ color: "var(--accent)" }}>
          Ingresá
        </Link>
      </p>
    </main>
  );
}
