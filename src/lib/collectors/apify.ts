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
// terceros sin un actor "oficial" único — el operador elige cuál usar.
// IMPORTANTE: el payload de `input` de abajo asume campos genéricos
// (`search`, `maxItems`) que HAY QUE AJUSTAR leyendo el README del actor
// elegido una vez que exista cuenta — el nombre real del campo de búsqueda
// varía por actor y no se puede verificar sin una.
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
    reviewsCount: pickNumber(raw, ["reviewsCount", "reviews", "numberOfReviews"]),
    imageUrl: pickString(raw, ["imageUrl", "image", "thumbnail"]),
  };
}

/**
 * Busca productos en un marketplace externo vía un actor de Apify.
 * APIFY_API_TOKEN es server-side (no BYOK) — sin token o sin actor
 * configurado en el servidor, degrada con gracia.
 */
export async function searchMarketplace(
  marketplace: Marketplace,
  query: string,
  maxItems = 10,
): Promise<MarketplaceSearchResult> {
  const token = process.env.APIFY_API_TOKEN?.trim();
  if (!token) {
    return degraded(
      marketplace,
      query,
      "Falta configurar APIFY_API_TOKEN en el servidor (cuenta de Apify de Selvoro).",
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

  // TODO: ajustar estos nombres de campo al esquema real del actor elegido
  // (leer su README en Apify Store) una vez que exista cuenta — "search"/
  // "maxItems" son un placeholder razonable, no una garantía.
  const input = { search: query, maxItems };

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
