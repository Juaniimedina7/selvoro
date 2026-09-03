import type { CountryCode } from "@/lib/taxonomy/niches";
import type { CollectorResult, MercadoLibreData, Signal } from "@/lib/types";

// Collector de Mercado Libre. Ancla local del MVP (competencia, saturación por
// catálogo). Usa la API de Productos (catálogo), NO la de búsqueda clásica.
//
// /sites/{site}/search quedó BLOQUEADA para apps de terceros: devuelve 403
// incluso con un access token válido de un usuario real recién autorizado
// (confirmado en vivo probando contra la API real — no es un tema de token
// vencido ni de scope). /products/search sí funciona con el mismo token y
// devuelve productos de catálogo reales (nombre, categoría/domain_id,
// cantidad total de matches) — sirve como señal de saturación/competencia
// igual de honesta, aunque distinta en forma a "publicaciones".
//
// Precio: /products/{id} expone buy_box_winner para el precio ganador, pero
// con el nivel de acceso de una app OAuth estándar viene null (probado en
// varios productos reales, ninguno lo trajo) — no es una limitación nuestra,
// es lo que la API devuelve para esta clase de app. Por eso priceMin/Max/
// Median quedan explícitamente null: preferimos "no disponible" antes que
// inventar un precio con una llamada extra que sabemos que no va a traer nada.
//
// Preferimos ML_ACCESS_TOKEN (server-wide, si está cargado); si no, el access
// token que el usuario conectó vía OAuth en mercadolibre_seller (BYOK, mismo
// patrón que meta-ads.ts) — así funciona para cualquier usuario que conectó
// su cuenta, sin depender de un único token compartido. Sin ninguno de los
// dos, degrada con gracia en vez de romper el pipeline (plan §8 y §13).

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

interface MlProductsSearchResponse {
  paging?: { total?: number };
  results?: Array<{
    id?: string;
    name?: string;
    domain_id?: string;
  }>;
}

export async function collectMercadoLibre(
  query: string,
  country: CountryCode = "AR",
  userAccessToken?: string,
): Promise<CollectorResult> {
  const source = "Mercado Libre API (catálogo)";
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
  if (!token) {
    return degraded(
      "Mercado Libre requiere autenticación para buscar. Conectá tu cuenta de Mercado Libre en Configuración → Integraciones, o cargá ML_ACCESS_TOKEN en el servidor.",
    );
  }

  const url = `${ML_API}/products/search?status=active&site_id=${site}&q=${encodeURIComponent(query)}&limit=20`;
  const headers: Record<string, string> = { Accept: "application/json", Authorization: `Bearer ${token}` };

  let res: Response;
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  } catch (e) {
    return degraded(
      "No se pudo contactar la API de Mercado Libre (timeout o red).",
      String(e),
    );
  }

  if (res.status === 401 || res.status === 403) {
    return degraded(
      "El access token de Mercado Libre fue rechazado (vencido, inválido, o la app no tiene permiso para /products/search). Reconectá la cuenta en Configuración → Integraciones.",
      `HTTP ${res.status}`,
    );
  }
  if (!res.ok) {
    return degraded(`Mercado Libre respondió HTTP ${res.status}.`, `HTTP ${res.status}`);
  }

  let json: MlProductsSearchResponse;
  try {
    json = (await res.json()) as MlProductsSearchResponse;
  } catch (e) {
    return degraded("Respuesta de Mercado Libre no parseable.", String(e));
  }

  const results = json.results ?? [];
  const totalListings = json.paging?.total ?? results.length;
  const domains = [...new Set(results.map((r) => r.domain_id).filter((d): d is string => !!d))];

  const data: MercadoLibreData = {
    available: true,
    totalListings,
    // La API de catálogo no expone precio ganador con este nivel de acceso
    // de app (buy_box_winner viene null) — no lo inventamos.
    priceMin: null,
    priceMax: null,
    priceMedian: null,
    currency: null,
    // La API de catálogo no expone vendedor por producto (es a nivel de
    // publicación/buy-box, no accesible acá) — sin datos de vendedores.
    topSellers: [],
    sampleTitles: results
      .map((r) => r.name)
      .filter((t): t is string => !!t)
      .slice(0, 8),
    note:
      domains.length > 0
        ? `Datos de catálogo de Mercado Libre (categoría: ${domains.slice(0, 2).join(", ")}). Precio y vendedores no disponibles con el nivel de acceso actual de la app — solo cantidad de productos de catálogo y nombres.`
        : "Datos de catálogo de Mercado Libre. Precio y vendedores no disponibles con el nivel de acceso actual de la app.",
  };

  const conf = totalListings != null && totalListings > 0 ? "media" : "baja";
  const signals: Signal[] = [
    {
      key: "ml_catalog_matches",
      label: "Productos de catálogo en Mercado Libre",
      value: totalListings,
      source,
      confidence: conf,
    },
    {
      key: "ml_catalog_domain",
      label: "Categoría de catálogo",
      value: domains[0] ?? null,
      source,
      confidence: domains.length ? "media" : "baja",
    },
  ];

  return { source, signals, raw: { mercadoLibre: data } };
}
