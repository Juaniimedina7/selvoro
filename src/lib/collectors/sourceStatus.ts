import { getUserCredential } from "@/lib/credentials/store";

// Estado de las fuentes de datos. Usado por la tool list_sources.
// Mercado Libre/Trends siguen siendo estado del SERVIDOR (env compartido);
// Meta Ad Library es BYOK, así que su estado es el del USUARIO que pregunta
// (clerkUserId), no un env var global — por eso la función es async y pide
// el usuario.

export interface SourceStatus {
  key: string;
  label: string;
  status: "activa" | "degradada" | "no_disponible";
  note: string;
}

export async function getSourceStatuses(clerkUserId?: string): Promise<SourceStatus[]> {
  const metaCredential = clerkUserId ? await getUserCredential(clerkUserId, "meta_ads") : null;

  return [
    {
      key: "mercado_libre",
      label: "Mercado Libre",
      status: process.env.ML_ACCESS_TOKEN?.trim() ? "activa" : "degradada",
      note: process.env.ML_ACCESS_TOKEN?.trim()
        ? "Usa API oficial autenticada."
        : "Usa el endpoint público sin token; si ML exige auth, degrada con gracia.",
    },
    {
      key: "google_trends",
      label: "Google Trends",
      status: "degradada",
      note: "Sin API oficial (flujo no oficial, best-effort). Siempre puede fallar y degradar.",
    },
    {
      key: "meta_ad_library",
      label: "Meta Ad Library",
      status: metaCredential?.accessToken ? "activa" : "no_disponible",
      note: metaCredential?.accessToken
        ? "Token propio configurado en Configuración → Integraciones."
        : "Requiere que cargues tu propio token en Configuración → Integraciones (app de Meta con App Review + verificación de negocio).",
    },
    {
      key: "tiktok_creative_center",
      label: "TikTok Creative Center",
      status: "no_disponible",
      note: "Sin API oficial. Omitido en esta fase del producto (decisión de producto, no falta de configuración).",
    },
    {
      key: "apify",
      label: "Apify (Amazon/AliExpress/Alibaba/Mercado Libre precio)",
      status:
        process.env.APIFY_API_TOKEN?.trim() &&
        (process.env.APIFY_AMAZON_ACTOR_ID ||
          process.env.APIFY_ALIEXPRESS_ACTOR_ID ||
          process.env.APIFY_ALIBABA_ACTOR_ID ||
          process.env.APIFY_MERCADOLIBRE_ACTOR_ID)
          ? "activa"
          : "no_disponible",
      note: process.env.APIFY_API_TOKEN?.trim()
        ? "APIFY_API_TOKEN configurado en el servidor. Requiere además al menos un APIFY_*_ACTOR_ID configurado."
        : "Requiere APIFY_API_TOKEN configurado en el servidor (cuenta de Apify de Selvoro, no BYOK).",
    },
  ];
}
