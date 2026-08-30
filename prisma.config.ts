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
    shadowDatabaseUrl: env("DIRECT_URL"),
  },
});
