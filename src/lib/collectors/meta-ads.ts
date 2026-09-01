import type { CountryCode } from "@/lib/taxonomy/niches";
import type { CollectorResult, MetaAdsData, MetaAdsMarketData, Signal } from "@/lib/types";

// Collector de Meta Ad Library. Diferenciador clave del producto: persistencia
// publicitaria y saturación real (plan §9). Es gratis pero requiere una app de
// Meta for Developers con el producto "Ads Library API" + permiso ads_read
// aprobado (App Review) + verificación de negocio. Mientras no esté configurado,
// degrada con gracia (mismo patrón que collectors/mercadolibre.ts).
//
// Deliberadamente NO se piden impressions/spend/age/gender/estimated_audience_size:
// solo se pueblan para anuncios políticos/de la UE, pedirlos construiría señales
// sobre campos que en la práctica vienen null para e-commerce comercial.

const DEFAULT_GRAPH_VERSION = "v21.0";
const ADS_FIELDS =
  "id,ad_creation_time,ad_delivery_start_time,ad_delivery_stop_time,page_id,page_name,ad_creative_bodies,ad_snapshot_url,publisher_platforms,languages";

interface MetaAd {
  id?: string;
  ad_creation_time?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  page_id?: string;
  page_name?: string;
  ad_creative_bodies?: string[];
}

interface AdsArchiveResponse {
  data?: MetaAd[];
  paging?: { next?: string };
}

interface GraphApiError {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number };
}

function daysSince(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

/** Resume los anuncios crudos de un mercado en MetaAdsMarketData. */
function summarizeMarket(ads: MetaAd[]): MetaAdsMarketData {
  const activeDays = ads
    .filter((a) => !a.ad_delivery_stop_time)
    .map((a) => daysSince(a.ad_delivery_start_time ?? a.ad_creation_time))
    .filter((d): d is number => d != null);

  const advertiserKeys = new Set(
    ads.map((a) => a.page_id ?? a.page_name).filter((k): k is string => !!k),
  );

  const byAdvertiser = new Map<string, number>();
  for (const a of ads) {
    const name = a.page_name ?? a.page_id;
    if (!name) continue;
    const d = daysSince(a.ad_delivery_start_time ?? a.ad_creation_time) ?? 0;
    byAdvertiser.set(name, Math.max(byAdvertiser.get(name) ?? 0, d));
  }
  const topAdvertisers = [...byAdvertiser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pageName, days]) => ({ pageName, activeDays: days }));

  const sampleAdSnippets = ads
    .flatMap((a) => a.ad_creative_bodies ?? [])
    .filter((s): s is string => !!s && s.trim().length > 0)
    .slice(0, 3)
    .map((s) => (s.length > 140 ? `${s.slice(0, 140)}…` : s));

  return {
    activeAdsCount: ads.length,
    truncated: ads.length >= 100,
    uniqueAdvertisers: advertiserKeys.size,
    avgActiveDays: activeDays.length
      ? Math.round(activeDays.reduce((s, d) => s + d, 0) / activeDays.length)
      : null,
    maxActiveDays: activeDays.length ? Math.max(...activeDays) : null,
    topAdvertisers,
    sampleAdSnippets,
  };
}

type FetchOutcome =
  | { ok: true; market: MetaAdsMarketData }
  | { ok: false; kind: "auth" | "permissions" | "rate_limit" | "bad_request" | "network"; message: string };

async function fetchMarket(
  query: string,
  country: CountryCode,
  token: string,
  version: string,
  limit = 100,
  dateFrom?: string,
  dateTo?: string,
): Promise<FetchOutcome> {
  const dateParams =
    (dateFrom ? `&ad_delivery_date_min=${encodeURIComponent(dateFrom)}` : "") +
    (dateTo ? `&ad_delivery_date_max=${encodeURIComponent(dateTo)}` : "");
  const url =
    `https://graph.facebook.com/${version}/ads_archive` +
    `?search_terms=${encodeURIComponent(query)}` +
    `&ad_reached_countries=${encodeURIComponent(JSON.stringify([country]))}` +
    `&ad_active_status=ACTIVE&ad_type=ALL&limit=${limit}` +
    dateParams +
    `&fields=${ADS_FIELDS}` +
    `&access_token=${encodeURIComponent(token)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    return { ok: false, kind: "network", message: String(e) };
  }

  if (res.status === 429) {
    return { ok: false, kind: "rate_limit", message: "HTTP 429" };
  }

  if (!res.ok) {
    let body: GraphApiError = {};
    try {
      body = (await res.json()) as GraphApiError;
    } catch {
      // respuesta no parseable, seguimos con body vacío
    }
    const code = body.error?.code;
    if (code === 190) {
      return { ok: false, kind: "auth", message: body.error?.message ?? `HTTP ${res.status}` };
    }
    if (code === 200 || /permission|ads_read/i.test(body.error?.message ?? "")) {
      return { ok: false, kind: "permissions", message: body.error?.message ?? `HTTP ${res.status}` };
    }
    if (code === 4 || code === 17 || code === 32) {
      return { ok: false, kind: "rate_limit", message: body.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: false, kind: "bad_request", message: body.error?.message ?? `HTTP ${res.status}` };
  }

  let json: AdsArchiveResponse;
  try {
    json = (await res.json()) as AdsArchiveResponse;
  } catch (e) {
    return { ok: false, kind: "bad_request", message: String(e) };
  }

  return { ok: true, market: summarizeMarket(json.data ?? []) };
}

/** Traduce el motivo de fallo de la Graph API a un mensaje humano y accionable. */
function describeFailure(failure: Extract<FetchOutcome, { ok: false }>): string {
  switch (failure.kind) {
    case "auth":
      return "El token de Meta Ad Library expiró o es inválido. Regenerá tu access token.";
    case "permissions":
      return "El token no tiene el permiso ads_read aprobado, o la app no completó App Review / verificación de negocio para Ads Library API.";
    case "rate_limit":
      return "Se alcanzó el límite de tasa de la Graph API de Meta. No se reintenta automáticamente; probá de nuevo en unos minutos.";
    case "network":
      return "No se pudo contactar la Ad Library API de Meta (timeout o red).";
    default:
      return "La consulta a Meta Ad Library fue rechazada (parámetros inválidos).";
  }
}

/** Valida un access token de Meta Ad Library con una consulta liviana (limit=1). Usado al guardar el credential en /dashboard/settings. */
export async function verifyMetaAdsAccessToken(token: string): Promise<{ ok: boolean; message: string }> {
  const version = process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_VERSION;
  const result = await fetchMarket("producto", "AR", token, version, 1);
  if (result.ok) return { ok: true, message: "Token válido." };
  return { ok: false, message: describeFailure(result) };
}

/**
 * Collector de Meta Ad Library. `accessToken` es el credential del usuario
 * (BYOK, ver src/lib/credentials/) — sin token, degrada con gracia igual que
 * cualquier otra fuente sin configurar.
 */
export async function collectMetaAds(
  query: string,
  accessToken?: string,
  country: CountryCode = "AR",
  dateFrom?: string,
  dateTo?: string,
): Promise<CollectorResult> {
  const source = "Meta Ad Library API";
  const token = accessToken?.trim();
  const version = process.env.META_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_VERSION;

  const degraded = (note: string, error?: string): CollectorResult => {
    const data: MetaAdsData = {
      available: false,
      ar: null,
      us: null,
      homeCountry: country,
      searchTermsUsed: query,
      note,
    };
    const signals: Signal[] = [
      {
        key: "meta_ads_status",
        label: "Cobertura Meta Ad Library",
        value: "no disponible",
        source,
        confidence: "baja",
        unavailable: true,
      },
    ];
    return { source, signals, raw: { metaAds: data }, error };
  };

  if (!token) {
    return degraded(
      "Meta Ad Library requiere que cargues tu propio access token en Configuración → Integraciones " +
        "(app en Meta for Developers + producto 'Ads Library API' + App Review + verificación de negocio).",
    );
  }

  const [arResult, usResult] = await Promise.all([
    fetchMarket(query, country, token, version, 100, dateFrom, dateTo),
    fetchMarket(query, "US", token, version, 100, dateFrom, dateTo),
  ]);

  if (!arResult.ok && !usResult.ok) {
    const failure = arResult.ok ? usResult : arResult;
    if (!failure.ok) {
      return degraded(describeFailure(failure), failure.message);
    }
  }

  const ar = arResult.ok ? arResult.market : null;
  const us = usResult.ok ? usResult.market : null;

  const data: MetaAdsData = {
    available: true,
    ar,
    us,
    homeCountry: country,
    searchTermsUsed: query,
  };

  if (ar && ar.activeAdsCount === 0 && us && us.activeAdsCount === 0) {
    data.note =
      "Meta Ad Library no devolvió anuncios activos ni en AR ni en US para este término. " +
      "Puede ser una señal real de baja inversión publicitaria, o que el término de búsqueda no " +
      "matchea el copy de los anuncios (marca, idioma, sinónimo). No tratar como ausencia confirmada.";
  }

  const marketConfidence = (m: MetaAdsMarketData | null) =>
    m && m.activeAdsCount != null && m.activeAdsCount > 0 && !m.truncated ? "media" : "baja";

  const signals: Signal[] = [];
  if (ar) {
    signals.push(
      {
        key: "meta_ads_active_ar",
        label: "Anuncios activos en Meta (AR, muestra)",
        value: ar.activeAdsCount,
        source,
        confidence: marketConfidence(ar),
      },
      {
        key: "meta_ads_advertisers_ar",
        label: "Anunciantes distintos con ads activos (AR, muestra)",
        value: ar.uniqueAdvertisers,
        source,
        confidence: marketConfidence(ar),
      },
      {
        key: "meta_ads_persistence_ar",
        label: "Antigüedad máxima de anuncio activo (AR, días)",
        value: ar.maxActiveDays,
        source,
        confidence: marketConfidence(ar),
      },
    );
  }
  if (us) {
    signals.push(
      {
        key: "meta_ads_active_us",
        label: "Anuncios activos en Meta (US, muestra)",
        value: us.activeAdsCount,
        source,
        confidence: marketConfidence(us),
      },
      {
        key: "meta_ads_persistence_us",
        label: "Antigüedad máxima de anuncio activo (US, días)",
        value: us.maxActiveDays,
        source,
        confidence: marketConfidence(us),
      },
    );
  }

  return { source, signals, raw: { metaAds: data } };
}
