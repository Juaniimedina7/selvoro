// Scraping liviano de una página pública de producto/tienda, SIN cuenta ni
// credenciales. Cubre un hueco real: Tienda Nube no tiene una API de
// búsqueda pública tipo marketplace (es federada, cada tienda es su propio
// dominio) — para ver un competidor puntual ahí alcanza con su URL pública,
// no hace falta ninguna cuenta (ni propia ni de la tienda). Lo mismo sirve
// para Shopify, WooCommerce o cualquier sitio propio mencionado en el brief.
//
// Solo lee el HTML que el servidor de la tienda ya sirve públicamente:
// <title>, meta og:*, y bloques JSON-LD schema.org/Product (la mayoría de
// plataformas de e-commerce los emiten para SEO, Tienda Nube y Shopify
// incluidos). No ejecuta JavaScript — un sitio armado como SPA sin datos
// estructurados va a devolver poco o nada, indicado explícitamente en
// `note` en vez de fallar. Browser automation (renderizar JS) queda fuera
// de alcance acá; si hiciera falta, la vía sería un actor genérico de Apify
// (ya integrado, ver collectors/apify.ts) en vez de sumar una dependencia
// nueva de rendering.

const FETCH_TIMEOUT_MS = 15000;
const MAX_HTML_CHARS = 2_000_000;

export interface ScrapedProduct {
  name?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  availability?: string;
}

export interface ScrapedPage {
  available: boolean;
  url: string;
  title?: string;
  description?: string;
  products: ScrapedProduct[];
  note?: string;
}

function extractTitle(html: string): string | undefined {
  return html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || undefined;
}

function extractMeta(html: string, name: string): string | undefined {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`, "i");
  return html.match(re)?.[1]?.trim() || undefined;
}

function collectProductsFromJsonLd(node: unknown, out: ScrapedProduct[]): void {
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;

  const graph = obj["@graph"];
  if (Array.isArray(graph)) {
    for (const g of graph) collectProductsFromJsonLd(g, out);
  }

  const type = obj["@type"];
  const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
  if (!isProduct) return;

  const offersRaw = obj.offers as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const offer = Array.isArray(offersRaw) ? offersRaw[0] : offersRaw;
  const priceRaw = offer?.price;
  const price = typeof priceRaw === "number" ? priceRaw : typeof priceRaw === "string" ? Number(priceRaw) : undefined;
  const image = obj.image;

  out.push({
    name: typeof obj.name === "string" ? obj.name : undefined,
    price: price != null && Number.isFinite(price) ? price : undefined,
    currency: typeof offer?.priceCurrency === "string" ? offer.priceCurrency : undefined,
    imageUrl: typeof image === "string" ? image : Array.isArray(image) && typeof image[0] === "string" ? image[0] : undefined,
    availability: typeof offer?.availability === "string" ? offer.availability.split("/").pop() : undefined,
  });
}

function extractJsonLdProducts(html: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = [];
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1]);
    } catch {
      continue;
    }
    for (const item of Array.isArray(parsed) ? parsed : [parsed]) {
      collectProductsFromJsonLd(item, products);
    }
  }
  return products;
}

export async function scrapePublicPage(url: string): Promise<ScrapedPage> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { available: false, url, products: [], note: "URL inválida." };
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { available: false, url, products: [], note: "Solo se soportan URLs http/https." };
  }

  let res: Response;
  try {
    res = await fetch(parsedUrl.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SelvoroBot/1.0)", Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (e) {
    return { available: false, url, products: [], note: `No se pudo contactar la página (timeout o red): ${String(e)}` };
  }

  if (!res.ok) {
    return { available: false, url, products: [], note: `La página respondió HTTP ${res.status}.` };
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("html")) {
    return { available: false, url, products: [], note: `Content-Type inesperado (no es HTML): ${contentType || "desconocido"}.` };
  }

  let html = await res.text();
  if (html.length > MAX_HTML_CHARS) html = html.slice(0, MAX_HTML_CHARS);

  const title = extractTitle(html);
  const description = extractMeta(html, "og:description") ?? extractMeta(html, "description");
  const products = extractJsonLdProducts(html);

  if (products.length === 0) {
    return {
      available: true,
      url,
      title,
      description,
      products: [],
      note:
        "No se encontraron datos estructurados (schema.org/Product) en la página. Puede ser un sitio renderizado " +
        "por JavaScript (SPA) — este scraper solo lee el HTML servido por el servidor, no ejecuta JS.",
    };
  }

  return { available: true, url, title, description, products };
}
