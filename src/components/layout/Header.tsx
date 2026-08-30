import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: 13,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "var(--accent)",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Selvoro
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 13.5 }}>
          <Link href="/pricing" style={{ color: "var(--muted)", textDecoration: "none" }}>
            Planes
          </Link>
          <Show when="signed-in">
            <Link href="/dashboard/chat" style={{ color: "var(--muted)", textDecoration: "none" }}>
              Chat
            </Link>
            <Link href="/dashboard/settings" style={{ color: "var(--muted)", textDecoration: "none" }}>
              Integraciones
            </Link>
            <Link href="/dashboard" style={{ color: "var(--muted)", textDecoration: "none" }}>
              Mi cuenta
            </Link>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                style={{
                  background: "var(--accent)",
                  color: "#0b0d10",
                  fontWeight: 700,
                  fontSize: 13,
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                Ingresar
              </button>
            </SignInButton>
          </Show>
        </nav>
      </div>
    </header>
  );
}
