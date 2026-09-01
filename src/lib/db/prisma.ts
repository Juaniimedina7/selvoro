import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Singleton de PrismaClient, mismo patrón que getLlm() en lib/llm/client.ts.
// En dev, Next recarga módulos en cada request — cacheamos en globalThis para
// no abrir una conexión nueva por hot-reload.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

// Proxy en vez de construir el cliente acá arriba: si DATABASE_URL falta o es
// inválido, `createClient()` puede tirar de forma síncrona. Eso, a nivel de
// módulo, rompería el import de CUALQUIER archivo que use prisma antes de que
// corra ningún try/catch del caller. Con el Proxy, la excepción recién salta
// en el primer uso real (p.ej. `prisma.conversation.findMany(...)`), que ya
// está envuelto en try/catch en cada caller — degradación con gracia en vez
// de un 500 crudo.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getClient(), prop);
  },
});
