// Búsqueda de productos en marketplaces externos (Amazon, AliExpress,
// Alibaba, y precio de Mercado Libre) vía Apify. Server-side (APIFY_API_TOKEN),
// NO es BYOK: mismo criterio que BUILTWITH_API_KEY/ML_ACCESS_TOKEN — la
// cuenta de Apify es de Selvoro, el costo de cada corrida de actor lo paga
// el servidor, no el usuario. Degrada con gracia sin token o sin actor
// configurado — nunca lanza, mismo patrón que el resto de los collectors.
//
// Los Actor IDs se configuran server-side por env var (APIFY_AMAZON_ACTOR_ID
// / APIFY_ALIEXPRESS_ACTOR_ID / APIFY_ALIBABA_ACTOR_ID /
// APIFY_MERCADOLIBRE_ACTOR_ID) porque Apify Store es un marketplace de
// terceros sin un actor "oficial" único.
//
// LOS 4 ESTÁN VERIFICADOS EN VIVO (corrida real contra la cuenta de Apify):
// - amazon -> gio21/amazon-search: input {keyword, domain, maxItems}.
// - mercadolibre -> gio21/mercado-libre-scraper: input {keyword, country,
//   maxItems (mínimo 10, restricción del actor), maxPages, sort}. OJO:
//   distinto de gio21/mercado-livre-scraper (con "v", Brasil/mercadolivre.com.br)
//   — ese NO sirve para Argentina, es fácil confundirlos por el nombre.
//   IMPORTANTE (no-determinismo confirmado): el mismo input ("iphone", AR)
//   devolvió 0 resultados reconocibles en una corrida y 10 en la siguiente,
//   ambas contra el mismo actor sin cambios — es scraping real, con
//   protección anti-bot de Mercado Libre que a veces gana. `note` en el
//   resultado ya cubre este caso ("no devolvió resultados reconocibles"),
//   pero NO es necesariamente señal de que el producto no existe.
// - aliexpress -> devcake/aliexpress-products-scraper: input {searchQueries
//   (array), maxProducts (mínimo 50, restricción del actor), sortBy}. Precio
//   ya viene numérico (priceCurrentMin/Max), no hace falta parsear string.
// - alibaba -> xtracto/alibaba-search-scraper: input {queries (array),
//   maxPagesPerQuery (~48 resultados/página)}. Precio viene SOLO como string
//   de rango (priceFormatted, ej. "$7.57-7.77") — se parsea el primer número
//   como precio "desde" (parsePriceRange). Sin campo de rating/reviews por
//   producto (supplierScore/reviewScore son del PROVEEDOR, no del listado
//   — no se mapean a rating para no mezclar señales distintas).
//
// "mercadolibre" acá es un target DISTINTO del collector nativo
// (collectors/mercadolibre.ts, API oficial de catálogo): sirve solo para
// recuperar PRECIO vía scraping, porque la API oficial no lo expone con el
// nivel de acceso de la app (buy_box_winner viene null, confirmado en vivo).
// pipeline.ts usa este resultado para backfillear priceMin/Max/Median del
// MercadoLibreData nativo, no lo reemplaza.

import type { Marketplace, MarketplaceSearchItem, MarketplaceSearchResult } from "@/lib/types";

export type { Marketplace, MarketplaceSearchItem, MarketplaceSearchResult };

const APIFY_API_BASE = "https://api.apify.com/v2";
const RUN_TIMEOUT_MS = 55_000;
const ITEMS_PER_ALIBABA_PAGE = 48;

const ACTOR_ENV_VAR: Record<Marketplace, string> = {
  amazon: "APIFY_AMAZON_ACTOR_ID",
  aliexpress: "APIFY_ALIEXPRESS_ACTOR_ID",
  alibaba: "APIFY_ALIBABA_ACTOR_ID",
  // Distinto del ML_ACCESS_TOKEN/mercadolibre_seller (API oficial, collectors/
  // mercadolibre.ts): esto es SOLO para recuperar precio vía scraping cuando
  // la API oficial no lo expone (buy_box_winner viene null con el nivel de
  // acceso de la app — ver pipeline.ts). collectMercadoLibre sigue siendo la
  // fuente de cantidad/nombres/categoría.
  mercadolibre: "APIFY_MERCADOLIBRE_ACTOR_ID",
};

// Mínimo de `maxItems` que cada actor acepta (confirmado en vivo: pedir menos
// tira HTTP 400 "Input is not valid"). Marketplaces sin entrada acá no
// tienen mínimo conocido.
const MIN_ITEMS: Partial<Record<Marketplace, number>> = {
  mercadolibre: 10,
  aliexpress: 50,
};

// Países que gio21/mercado-libre-scraper soporta (17 sitios LatAm
// hispanohablantes — NO incluye Brasil, que usa un actor distinto). Si
// input.market cae fuera de esta lista (ej. US, BR, ES), no tiene sentido
// correr el actor — degrada sin gastar la corrida.
const ML_SCRAPER_COUNTRIES = new Set([
  "AR", "MX", "CO", "CL", "PE", "UY", "VE", "EC", "BO", "PY", "PA", "DO", "CR", "GT", "HN", "NI", "SV",
]);

function degraded(marketplace: Marketplace, query: string, note: string): MarketplaceSearchResult {
  return { available: false, marketplace, query, items: [], note };
}

// Item de dataset devuelto por el actor: shape desconocido hasta elegir uno
// real, se normaliza defensivamente probando los nombres de campo más
// comunes entre scrapers de e-commerce.
type RawDatasetItem = Record<string, unknown>;

function pickString(item: RawDatasetItem, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = item[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function pickNumber(item: RawDatasetItem, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = item[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return undefined;
}

// Extrae el primer número de un string de precio/rango formateado (ej.
// "$7.57-7.77", "US $29.99", "$3.50 - $4.20") — usado por xtracto/
// alibaba-search-scraper, que solo expone `priceFormatted` como texto, sin
// campo numérico (a diferencia de AliExpress, que sí trae priceCurrentMin).
function parsePriceRange(formatted: string | undefined): number | undefined {
  if (!formatted) return undefined;
  const match = formatted.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeItem(raw: RawDatasetItem): MarketplaceSearchItem | null {
  const title = pickString(raw, ["title", "name", "productTitle"]);
  if (!title) return null;
  // priceCurrentMin (AliExpress, ya numérico) antes que el genérico "price"
  // — y si ninguno de los dos aparece, parsePriceRange(priceFormatted)
  // cubre a Alibaba (que solo expone el precio como texto de rango).
  const price =
    pickNumber(raw, ["priceCurrentMin", "price", "priceValue", "currentPrice"]) ??
    parsePriceRange(pickString(raw, ["priceFormatted"]));
  return {
    title,
    url: pickString(raw, ["url", "productUrl", "link"]),
    price,
    currency: pickString(raw, ["priceCurrency", "currency"]),
    rating: pickNumber(raw, ["rating", "ratingValue", "stars", "productRating"]),
    // "ratingCount" (gio21/amazon-search) y "reviewCount" (gio21/mercado-libre-scraper,
    // devcake/aliexpress-products-scraper) son los nombres reales confirmados
    // en vivo. Alibaba (xtracto/alibaba-search-scraper) no expone reviews por
    // producto — queda undefined ahí, correcto (no hay campo que mapear).
    reviewsCount: pickNumber(raw, ["ratingCount", "reviewCount", "reviewsCount", "reviews", "numberOfReviews"]),
    imageUrl: pickString(raw, ["imageUrl", "mainImage", "image", "thumbnail"]),
  };
}

/**
 * Arma el payload de `input` para el actor de cada marketplace — los 4
 * esquemas están verificados en vivo contra la cuenta de Apify (ver
 * comentario de cabecera). `maxItems` ya viene clampeado a MIN_ITEMS por
 * el caller (searchMarketplace).
 */
function buildInput(marketplace: Marketplace, query: string, maxItems: number, country: string): Record<string, unknown> {
  switch (marketplace) {
    case "amazon":
      return { keyword: query, domain: "amazon.com", maxItems };
    case "mercadolibre":
      return { keyword: query, country, maxItems };
    case "aliexpress":
      return { searchQueries: [query], maxProducts: maxItems };
    case "alibaba":
      // Sin parámetro de "cantidad total" directo — cada página trae ~48
      // resultados, así que se pide la cantidad de páginas necesaria para
      // cubrir maxItems (el .slice(0, maxItems) final igual acota el output).
      return { queries: [query], maxPagesPerQuery: Math.max(1, Math.ceil(maxItems / ITEMS_PER_ALIBABA_PAGE)) };
  }
}

/**
 * Busca productos en un marketplace externo vía un actor de Apify.
 * APIFY_API_TOKEN es server-side (no BYOK) — sin token o sin actor
 * configurado en el servidor, degrada con gracia. `country` (ISO-2, default
 * "AR") solo aplica a "mercadolibre" — el resto de los marketplaces son
 * globales y lo ignoran.
 */
export async function searchMarketplace(
  marketplace: Marketplace,
  query: string,
  maxItems = 10,
  country = "AR",
): Promise<MarketplaceSearchResult> {
  const token = process.env.APIFY_API_TOKEN?.trim();
  if (!token) {
    return degraded(
      marketplace,
      query,
      "Falta configurar APIFY_API_TOKEN en el servidor (cuenta de Apify de Selvoro).",
    );
  }

  if (marketplace === "mercadolibre" && !ML_SCRAPER_COUNTRIES.has(country)) {
    return degraded(
      marketplace,
      query,
      `El actor de Mercado Libre no cubre el mercado ${country} (solo 17 países hispanohablantes de LatAm).`,
    );
  }

  const actorId = process.env[ACTOR_ENV_VAR[marketplace]]?.trim();
  if (!actorId) {
    return degraded(
      marketplace,
      query,
      `Falta configurar ${ACTOR_ENV_VAR[marketplace]} en el servidor: el id de un actor de Apify Store que busque productos en ${marketplace}.`,
    );
  }

  const effectiveMaxItems = Math.max(maxItems, MIN_ITEMS[marketplace] ?? 1);
  const input = buildInput(marketplace, query, effectiveMaxItems, country);

  let res: Response;
  try {
    const url =
      `${APIFY_API_BASE}/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items` +
      `?token=${encodeURIComponent(token)}`;
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
    });
  } catch (e) {
    return degraded(marketplace, query, `No se pudo contactar Apify (timeout o red): ${String(e)}`);
  }

  if (!res.ok) {
    let message = `Apify respondió HTTP ${res.status}.`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      // respuesta no parseable, seguimos con el mensaje genérico
    }
    return degraded(marketplace, query, message);
  }

  let raw: RawDatasetItem[];
  try {
    raw = (await res.json()) as RawDatasetItem[];
  } catch (e) {
    return degraded(marketplace, query, `Apify devolvió una respuesta no parseable: ${String(e)}`);
  }

  const items = raw
    .map(normalizeItem)
    .filter((i): i is MarketplaceSearchItem => i != null)
    .slice(0, maxItems);

  if (items.length === 0) {
    return {
      available: true,
      marketplace,
      query,
      items: [],
      note:
        "El actor no devolvió resultados reconocibles. Puede ser que no haya matches, o que el esquema de campos " +
        "del actor elegido no coincida con los nombres esperados (revisar buildInput/normalizeItem en apify.ts).",
    };
  }

  return { available: true, marketplace, query, items };
}
