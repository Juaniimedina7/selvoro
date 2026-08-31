import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
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
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <p className="s-eyebrow">Bienvenido de nuevo</p>
        <h1 className="s-display" style={{ fontSize: 28, margin: "10px 0 6px" }}>
          Entrá a tu analista de mercado
        </h1>
        <p className="s-lead" style={{ fontSize: 15 }}>
          Seguí validando productos con evidencia real.
        </p>
      </div>

      <SignIn signUpUrl="/sign-up" />

      <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
        ¿No tenés cuenta?{" "}
        <Link href="/sign-up" style={{ color: "var(--accent)" }}>
          Creá una gratis
        </Link>
      </p>
    </main>
  );
}
