// Snapshot de la cuenta vendedora de Mercado Libre conectada por el usuario
// (BYOK vía OAuth, distinto del ML_ACCESS_TOKEN server-side que usa la
// búsqueda pública). Trae datos reales de la propia cuenta: publicaciones
// activas, nickname. Degrada con gracia si no hay credential o la API falla.

export interface MercadoLibreSellerSnapshot {
  available: boolean;
  nickname?: string;
  activeListingsCount?: number;
  activeListingsCountTruncated?: boolean;
  note?: string;
}

interface ItemsSearchResponse {
  paging?: { total?: number };
  results?: string[];
}

interface UserResponse {
  nickname?: string;
}

export async function getMercadoLibreSellerSnapshot(
  accessToken: string | undefined,
  sellerId: string | undefined,
): Promise<MercadoLibreSellerSnapshot> {
  if (!accessToken || !sellerId) {
    return {
      available: false,
      note: "No conectaste tu cuenta vendedora de Mercado Libre en Configuración → Integraciones.",
    };
  }

  let user: UserResponse | null = null;
  let items: ItemsSearchResponse | null = null;
  try {
    const [userRes, itemsRes] = await Promise.all([
      fetch(`https://api.mercadolibre.com/users/${sellerId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15000),
      }),
      fetch(`https://api.mercadolibre.com/users/${sellerId}/items/search?limit=100`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15000),
      }),
    ]);
    if (userRes.ok) user = (await userRes.json()) as UserResponse;
    if (itemsRes.ok) items = (await itemsRes.json()) as ItemsSearchResponse;
  } catch {
    return { available: false, note: "No se pudo contactar la API de Mercado Libre (token inválido o timeout)." };
  }

  if (!user && !items) {
    return { available: false, note: "El token de Mercado Libre expiró o no tiene permisos suficientes." };
  }

  const total = items?.paging?.total;
  const sample = items?.results?.length ?? 0;

  return {
    available: true,
    nickname: user?.nickname,
    activeListingsCount: total ?? sample,
    activeListingsCountTruncated: total == null && sample >= 100,
    note: "Publicaciones activas propias, dato real (no proxy).",
  };
}
