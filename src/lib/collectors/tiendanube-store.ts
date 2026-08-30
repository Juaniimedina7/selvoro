import { TIENDANUBE_API_VERSION, TIENDANUBE_USER_AGENT } from "@/lib/credentials/oauth/tiendaNube";

// Snapshot de la tienda de Tienda Nube conectada por el usuario (BYOK vía
// OAuth). Trae datos reales (no proxies): nombre, cantidad de productos,
// pedidos recientes. Degrada con gracia si no hay credential o la API falla.

export interface TiendaNubeSnapshot {
  available: boolean;
  storeName?: string;
  /** Piso, no total exacto: es el tamaño de una sola página (ver `productCountTruncated`). */
  productCount?: number;
  productCountTruncated?: boolean;
  recentOrdersCount?: number;
  recentOrdersCountTruncated?: boolean;
  note?: string;
}

interface StoreResponse {
  name?: { es?: string; pt?: string; en?: string } | string;
}

async function apiGet<T>(storeId: string, accessToken: string, path: string): Promise<T | null> {
  try {
    const res = await fetch(`https://api.tiendanube.com/${TIENDANUBE_API_VERSION}/${storeId}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": TIENDANUBE_USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getTiendaNubeSnapshot(
  accessToken: string | undefined,
  storeId: string | undefined,
): Promise<TiendaNubeSnapshot> {
  if (!accessToken || !storeId) {
    return { available: false, note: "No conectaste tu tienda de Tienda Nube en Configuración → Integraciones." };
  }

  const PAGE_SIZE = 200;
  const [store, products, orders] = await Promise.all([
    apiGet<StoreResponse>(storeId, accessToken, "/store"),
    apiGet<unknown[]>(storeId, accessToken, `/products?per_page=${PAGE_SIZE}`),
    apiGet<unknown[]>(storeId, accessToken, `/orders?per_page=${PAGE_SIZE}`),
  ]);

  if (!store && !products && !orders) {
    return { available: false, note: "No se pudo contactar la API de Tienda Nube (token inválido o timeout)." };
  }

  const storeName =
    (store
      ? typeof store.name === "string"
        ? store.name
        : (store.name?.es ?? store.name?.pt ?? store.name?.en)
      : undefined) ?? undefined;

  return {
    available: true,
    storeName,
    productCount: Array.isArray(products) ? products.length : undefined,
    productCountTruncated: Array.isArray(products) && products.length >= PAGE_SIZE,
    recentOrdersCount: Array.isArray(orders) ? orders.length : undefined,
    recentOrdersCountTruncated: Array.isArray(orders) && orders.length >= PAGE_SIZE,
    note: "Productos/pedidos son un piso (una sola página), no el total exacto si la tienda supera esa página.",
  };
}
