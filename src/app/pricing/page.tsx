import { auth } from "@clerk/nextjs/server";
import { PLANS } from "@/lib/billing/plans";
import { getActiveSubscription } from "@/lib/billing/subscriptions";
import { PlanCard } from "@/components/billing/PlanCard";

export default async function PricingPage() {
  const { userId } = await auth();
  const activeSub = userId ? await getActiveSubscription(userId) : null;

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 80px" }}>
      <header style={{ textAlign: "center", marginBottom: 36 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px" }}>Planes</h1>
        <p style={{ color: "var(--muted)", fontSize: 15, margin: 0 }}>
          Suscripción mensual. Los créditos se resetean cada ciclo, no se
          acumulan. Cancelás cuando quieras.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 18,
        }}
      >
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.code}
            plan={plan}
            highlighted={plan.code === "pro"}
            isSignedIn={!!userId}
            isCurrentPlan={activeSub?.plan.code === plan.code && activeSub.status === "ACTIVE"}
          />
        ))}
      </div>

      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 12.5, marginTop: 28 }}>
        Precios en pesos argentinos. Pago procesado por Mercado Pago.
      </p>
    </main>
  );
}
