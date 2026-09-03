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
// Verificado EN VIVO (corrida real contra la cuenta de Apify) para 2 de los 4:
// - amazon -> gio21/amazon-search: input {keyword, domain, maxItems}. Probado
//   con "termo mate", trajo 3/3 resultados reales con precio/rating/reviews.
// - mercadolibre -> gio21/mercado-libre-scraper: input {keyword, country,
//   maxItems (>=10, mínimo del actor), maxPages, sort}. OJO: distinto de
//   gio21/mercado-livre-scraper (con "v", Brasil/mercadolivre.com.br) — ese
//   NO sirve para Argentina, es fácil confundirlos por el nombre.
//   IMPORTANTE (no-determinismo confirmado): el mismo input ("iphone", AR)
//   devolvió 0 resultados reconocibles en una corrida y 10 en la siguiente,
//   ambas contra el mismo actor sin cambios — es scraping real, con
//   protección anti-bot de Mercado Libre que a veces gana. `note` en el
//   resultado ya cubre este caso ("no devolvió resultados reconocibles"),
//   pero NO es necesariamente señal de que el producto no existe — el
//   caller no debería tratar un array vacío acá como "sin competencia".
// aliexpress/alibaba: NINGÚN actor de búsqueda por keyword disponible entre
// los revisados (7 actores de gio21) — los únicos actores de Alibaba/1688
// encontrados son de DETALLE por URL (no keyword search), no encajan con
// esta arquitectura. Siguen con el payload placeholder ({ search, maxItems })
// hasta encontrar uno real, y degradan con gracia sin actor configurado.
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

function normalizeItem(raw: RawDatasetItem): MarketplaceSearchItem | null {
  const title = pickString(raw, ["title", "name", "productTitle"]);
  if (!title) return null;
  return {
    title,
    url: pickString(raw, ["url", "productUrl", "link"]),
    price: pickNumber(raw, ["price", "priceValue", "currentPrice"]),
    currency: pickString(raw, ["currency", "priceCurrency"]),
    rating: pickNumber(raw, ["rating", "stars", "productRating"]),
    // "ratingCount" (gio21/amazon-search) y "reviewCount" (gio21/mercado-libre-scraper)
    // son los nombres reales confirmados en vivo — se mantienen los genéricos
    // como fallback para actores todavía no verificados (aliexpress/alibaba).
    reviewsCount: pickNumber(raw, ["ratingCount", "reviewCount", "reviewsCount", "reviews", "numberOfReviews"]),
    imageUrl: pickString(raw, ["imageUrl", "image", "thumbnail"]),
  };
}

/**
 * Arma el payload de `input` para el actor de cada marketplace. Amazon y
 * Mercado Libre usan el esquema real, confirmado en vivo contra la cuenta de
 * Apify (ver comentario arriba). AliExpress/Alibaba no tienen actor de
 * keyword search verificado todavía — placeholder documentado.
 */
function buildInput(marketplace: Marketplace, query: string, maxItems: number, country: string): Record<string, unknown> {
  switch (marketplace) {
    case "amazon":
      return { keyword: query, domain: "amazon.com", maxItems };
    case "mercadolibre":
      return { keyword: query, country, maxItems };
    case "aliexpress":
    case "alibaba":
      // TODO: sin actor de búsqueda por keyword verificado — ajustar cuando
      // se elija uno real (ver comentario de cabecera del archivo).
      return { search: query, maxItems };
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

  const input = buildInput(marketplace, query, maxItems, country);

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
