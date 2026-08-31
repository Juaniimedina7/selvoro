import type { CountryCode } from "@/lib/taxonomy/niches";
import type { CollectorResult, MercadoLibreData, Signal } from "@/lib/types";

// Collector de Mercado Libre. Ancla local del MVP (precio, competencia, listings).
// Usa la API oficial. ML dejó de aceptar búsquedas anónimas: /sites/{site}/search
// devuelve 403 sin un access token válido (confirmado en vivo, no es un bug
// nuestro ni un bloqueo por User-Agent). Por eso el token ya no es "opcional":
// preferimos ML_ACCESS_TOKEN (server-wide, si está cargado), y si no,
// usamos el access token que el usuario conectó vía OAuth en mercadolibre_seller
// (mismo patrón BYOK que meta-ads.ts) — así el collector funciona para
// cualquier usuario que haya conectado su propia cuenta, sin depender de un
// único token compartido. Si no hay ninguno de los dos, degrada con gracia
// en vez de romper el pipeline (ver plan §8 y §13: "sin datos" != "sin competencia").

const ML_API = "https://api.mercadolibre.com";

// Mercado Libre opera solo en LATAM: cada país tiene su "site id". US y ES no
// están cubiertos → el collector degrada con gracia para esos mercados.
const ML_SITE_BY_COUNTRY: Partial<Record<CountryCode, string>> = {
  AR: "MLA",
  MX: "MLM",
  BR: "MLB",
  CL: "MLC",
  CO: "MCO",
  UY: "MLU",
  PE: "MPE",
};

interface MlSearchResponse {
  paging?: { total?: number };
  results?: Array<{
    title?: string;
    price?: number;
    currency_id?: string;
    sold_quantity?: number;
    seller?: { nickname?: string };
  }>;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export async function collectMercadoLibre(
  query: string,
  country: CountryCode = "AR",
  userAccessToken?: string,
): Promise<CollectorResult> {
  const source = "Mercado Libre API";
  // Site por país; si no está mapeado (US, ES) usamos ML_SITE_ID o degradamos.
  const site = ML_SITE_BY_COUNTRY[country] ?? process.env.ML_SITE_ID;
  // Server-wide primero (cubre a todos los usuarios sin que nadie tenga que
  // conectar nada); si no está configurado, el access token que el usuario
  // conectó como vendedor de ML (BYOK) sirve igual para autenticar la búsqueda.
  const token = process.env.ML_ACCESS_TOKEN?.trim() || userAccessToken?.trim();

  const degraded = (note: string, error?: string): CollectorResult => {
    const data: MercadoLibreData = {
      available: false,
      totalListings: null,
      priceMin: null,
      priceMax: null,
      priceMedian: null,
      currency: null,
      topSellers: [],
      sampleTitles: [],
      note,
    };
    const signals: Signal[] = [
      {
        key: "ml_status",
        label: "Cobertura Mercado Libre",
        value: "no disponible",
        source,
        confidence: "baja",
        unavailable: true,
      },
    ];
    return { source, signals, raw: { mercadoLibre: data }, error };
  };

  if (!site) {
    return degraded(
      `Mercado Libre no opera en ${country} (solo cubre LATAM: AR, MX, BR, CL, CO, UY, PE). Se usan las demás fuentes para este mercado.`,
    );
  }

  const url = `${ML_API}/sites/${site}/search?q=${encodeURIComponent(query)}&limit=50`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  } catch (e) {
    return degraded(
      "No se pudo contactar la API de Mercado Libre (timeout o red).",
      String(e),
    );
  }

  if (res.status === 401 || res.status === 403) {
    return degraded(
      token
        ? "El access token de Mercado Libre fue rechazado (vencido o inválido)."
        : "Mercado Libre requiere autenticación para buscar. Conectá tu cuenta de Mercado Libre en Configuración → Integraciones, o cargá ML_ACCESS_TOKEN en el servidor.",
      `HTTP ${res.status}`,
    );
  }
  if (!res.ok) {
    return degraded(`Mercado Libre respondió HTTP ${res.status}.`, `HTTP ${res.status}`);
  }

  let json: MlSearchResponse;
  try {
    json = (await res.json()) as MlSearchResponse;
  } catch (e) {
    return degraded("Respuesta de Mercado Libre no parseable.", String(e));
  }

  const results = json.results ?? [];
  const prices = results
    .map((r) => r.price)
    .filter((p): p is number => typeof p === "number" && p > 0);

  const currency = results.find((r) => r.currency_id)?.currency_id ?? null;
  const totalListings = json.paging?.total ?? results.length;

  const topSellers = results
    .filter((r) => r.seller?.nickname)
    .slice(0, 5)
    .map((r) => ({
      nickname: r.seller!.nickname!,
      soldSignal:
        typeof r.sold_quantity === "number" ? `${r.sold_quantity}+ ventas (proxy)` : null,
    }));

  const data: MercadoLibreData = {
    available: true,
    totalListings,
    priceMin: prices.length ? Math.min(...prices) : null,
    priceMax: prices.length ? Math.max(...prices) : null,
    priceMedian: median(prices),
    currency,
    topSellers,
    sampleTitles: results
      .map((r) => r.title)
      .filter((t): t is string => !!t)
      .slice(0, 8),
  };

  const conf = totalListings != null && totalListings > 0 ? "media" : "baja";
  const signals: Signal[] = [
    {
      key: "ml_listings",
      label: "Publicaciones en Mercado Libre AR",
      value: totalListings,
      source,
      confidence: conf,
    },
    {
      key: "ml_price_median",
      label: `Precio mediano (${currency ?? "moneda local"})`,
      value: data.priceMedian,
      source,
      confidence: prices.length ? "media" : "baja",
    },
    {
      key: "ml_price_range",
      label: "Rango de precios",
      value:
        data.priceMin != null && data.priceMax != null
          ? `${data.priceMin} - ${data.priceMax}`
          : null,
      source,
      confidence: prices.length ? "media" : "baja",
    },
    {
      key: "ml_competitors",
      label: "Vendedores locales visibles (muestra)",
      value: topSellers.length,
      source,
      confidence: "baja",
    },
  ];

  return { source, signals, raw: { mercadoLibre: data } };
}
