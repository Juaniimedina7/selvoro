import { auth } from "@clerk/nextjs/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Página protegida "resource-based": redirige a sign-in si no hay sesión.
  await auth.protect();

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 20px 80px" }}>{children}</main>
  );
}
