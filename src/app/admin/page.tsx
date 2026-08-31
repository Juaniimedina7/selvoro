import { redirect } from "next/navigation";
import { clerkClient } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";

// Panel interno del equipo Selvoro. Protegido a rol admin: si no lo sos, redirige.
export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="s-card">
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/dashboard");

  const client = await clerkClient();
  const [userList, reportCount, subsActive, subsTotal] = await Promise.all([
    client.users.getUserList({ limit: 1 }),
    prisma.report.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count(),
  ]);

  return (
    <main className="s-wrap" style={{ maxWidth: 960, paddingBlock: "40px 80px" }}>
      <p className="s-eyebrow">Equipo Selvoro</p>
      <h1 className="s-display" style={{ fontSize: 28, margin: "8px 0 24px" }}>
        Panel interno
      </h1>

      <div className="s-grid s-grid--3">
        <Stat label="Usuarios" value={userList.totalCount} />
        <Stat label="Reportes generados" value={reportCount} />
        <Stat label="Suscripciones activas" value={`${subsActive} / ${subsTotal}`} />
      </div>

      <p style={{ marginTop: 24, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
        Los roles se asignan en el dashboard de Clerk (publicMetadata.role = &quot;admin&quot; | &quot;socio&quot;).
        admin y socio no gastan créditos.
      </p>
    </main>
  );
}
