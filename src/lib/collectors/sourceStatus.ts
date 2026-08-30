// Estado de las fuentes de datos, sin hacer ninguna llamada externa (solo
// chequea configuración). Usado por la tool list_sources.

export interface SourceStatus {
  key: string;
  label: string;
  status: "activa" | "degradada" | "no_disponible";
  note: string;
}

export function getSourceStatuses(): SourceStatus[] {
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
      status: process.env.META_ADS_ACCESS_TOKEN?.trim() ? "activa" : "no_disponible",
      note: process.env.META_ADS_ACCESS_TOKEN?.trim()
        ? "Token configurado."
        : "Requiere META_ADS_ACCESS_TOKEN (app de Meta con App Review + verificación de negocio).",
    },
    {
      key: "tiktok_creative_center",
      label: "TikTok Creative Center",
      status: "no_disponible",
      note: "Sin API oficial. Omitido en esta fase del producto (decisión de producto, no falta de configuración).",
    },
  ];
}
