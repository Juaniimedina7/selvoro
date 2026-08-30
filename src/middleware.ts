import { clerkMiddleware } from "@clerk/nextjs/server";

// Solo habilita la detección de sesión de Clerk (auth()/currentUser() en
// Server Components y route handlers). La protección real es "resource-based":
// cada página/route handler protegido llama a auth() explícitamente (ver
// src/app/api/analyze/route.ts, dashboard/*). Clerk desaconseja proteger por
// coincidencia de path en middleware (createRouteMatcher está deprecado) porque
// puede desincronizarse de cómo Next.js resuelve rutas.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
