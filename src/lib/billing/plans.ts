// Fuente de verdad de los 3 planes de Selvoro. La sembramos en la tabla Plan
// (prisma/seed.ts) y la usamos acá para armar el checkout de Mercado Pago sin
// depender de un round-trip a la DB. Precios tentativos — validar contra el
// costo real de Claude Opus por análisis antes de lanzar.

export type PlanCode = "starter" | "pro" | "agencia";

export interface PlanConfig {
  code: PlanCode;
  name: string;
  priceArs: number;
  monthlyCredits: number;
}

export const PLANS: readonly PlanConfig[] = [
  { code: "starter", name: "Starter", priceArs: 9900, monthlyCredits: 10 },
  { code: "pro", name: "Pro", priceArs: 24900, monthlyCredits: 30 },
  { code: "agencia", name: "Agencia", priceArs: 59900, monthlyCredits: 100 },
];

export function getPlanConfig(code: string): PlanConfig | undefined {
  return PLANS.find((p) => p.code === code);
}
