import Image from "next/image";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid var(--border)",
        background: "color-mix(in srgb, var(--background) 82%, transparent)",
        backdropFilter: "saturate(1.1) blur(8px)",
      }}
    >
      <div
        className="s-wrap"
        style={{
          height: 62,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          aria-label="Selvoro — inicio"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            textDecoration: "none",
          }}
        >
          <Image
            src="/logo-mark.png"
            alt=""
            width={28}
            height={28}
            priority
            style={{ display: "block" }}
          />
          <span
            style={{
              fontFamily: "var(--font-display), sans-serif",
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              color: "var(--text)",
            }}
          >
            Selvoro
          </span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 14 }}>
          <Show when="signed-in">
            <Link href="/dashboard/chat" style={navLink}>Chat</Link>
            <Link href="/dashboard/settings" style={navLink}>Integraciones</Link>
            <Link href="/pricing" style={navLink}>Planes</Link>
            <Link href="/dashboard" style={navLink}>Mi cuenta</Link>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <Link href="/pricing" style={navLink}>Planes</Link>
            <SignInButton mode="modal">
              <button style={navLink} type="button">Ingresar</button>
            </SignInButton>
            <Link href="/sign-up" className="s-btn s-btn--primary" style={{ padding: "9px 16px", fontSize: 14 }}>
              Crear cuenta
            </Link>
          </Show>
        </nav>
      </div>
    </header>
  );
}

const navLink: React.CSSProperties = {
  color: "var(--muted)",
  textDecoration: "none",
  fontFamily: "var(--font-body), sans-serif",
  fontSize: 14,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 0,
};
