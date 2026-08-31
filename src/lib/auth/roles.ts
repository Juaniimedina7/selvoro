import { currentUser } from "@clerk/nextjs/server";

// Roles de usuario (distintos del PLAN de suscripción: starter/pro/agencia).
// Se guardan en Clerk publicMetadata.role — se setean desde el dashboard de
// Clerk (o vía backend API) sin necesitar tabla local.
//
// - admin  : equipo Selvoro. Bypass de créditos + panel interno /admin.
// - socio  : partner. Solo bypass de créditos (sin panel).
// - member : usuario normal (default). Créditos según su plan.

export type Role = "admin" | "socio" | "member";

function normalize(role: unknown): Role {
  return role === "admin" || role === "socio" ? role : "member";
}

/** Rol del usuario de la sesión actual (member si no hay sesión o sin rol). */
export async function getCurrentRole(): Promise<Role> {
  const user = await currentUser();
  return normalize((user?.publicMetadata as { role?: unknown } | undefined)?.role);
}

/** admin y socio no gastan créditos. */
export function roleHasCreditBypass(role: Role): boolean {
  return role === "admin" || role === "socio";
}

export async function isAdmin(): Promise<boolean> {
  return (await getCurrentRole()) === "admin";
}
