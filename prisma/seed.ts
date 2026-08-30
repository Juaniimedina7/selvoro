import { config } from "dotenv";

// Standalone (`npm run db:seed`) no pasa por prisma.config.ts, así que cargamos
// .env.local acá también. Los imports de módulos que leen process.env al
// evaluarse (src/lib/db/prisma.ts) van dinámicos: un `import` estático se
// resuelve antes que cualquier statement de este archivo, así que un
// import estático correría antes que este config().
config({ path: ".env.local" });

async function main() {
  const { prisma } = await import("../src/lib/db/prisma");
  const { PLANS } = await import("../src/lib/billing/plans");

  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: { name: plan.name, priceArs: plan.priceArs, monthlyCredits: plan.monthlyCredits },
      create: plan,
    });
  }
  console.log(`Sembrados ${PLANS.length} planes.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
