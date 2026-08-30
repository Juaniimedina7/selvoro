import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma CLI (migrate/generate/studio/seed) no lee .env.local automáticamente
// como sí lo hace Next.js — lo cargamos a mano para mantener la misma
// convención que el resto del proyecto (.env.example -> .env.local).
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // shadowDatabaseUrl es una DB vacía dedicada para que `migrate dev` pueda
    // diffear migraciones sin tocar la real — NO es lo mismo que DIRECT_URL
    // (esa es la misma DB de siempre, solo sin pooler). Con Neon: otra DB en
    // el mismo proyecto (ver README, sección de setup de Prisma).
    shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});
