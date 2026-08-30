// Stack tecnológico de un dominio (competidor) vía BuiltWith Free API.
// Server-side (BUILTWITH_API_KEY), NO es BYOK: es gratis y no es dato
// personal del usuario, misma categoría que ML_ACCESS_TOKEN. Degrada con
// gracia sin key. Rate limit del proveedor: 1 req/seg.

const FREE_API_BASE = "https://api.builtwith.com/free1/api.json";

export interface TechStackGroup {
  name: string;
  activeTechnologies: number;
  categories: string[];
}

export interface TechStackResult {
  available: boolean;
  domain: string;
  groups: TechStackGroup[];
  note?: string;
}

interface BuiltWithCategory {
  name?: string;
  live?: number;
}

interface BuiltWithGroup {
  name?: string;
  live?: number;
  categories?: BuiltWithCategory[];
}

interface BuiltWithResponse {
  free1?: { groups?: BuiltWithGroup[] };
  Errors?: { Message?: string }[];
}

export async function lookupTechStack(domain: string): Promise<TechStackResult> {
  const key = process.env.BUILTWITH_API_KEY?.trim();
  const cleanDomain = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  if (!key) {
    return {
      available: false,
      domain: cleanDomain,
      groups: [],
      note: "Requiere BUILTWITH_API_KEY (registro gratuito en builtwith.com) configurado en el servidor.",
    };
  }

  let res: Response;
  try {
    const url = `${FREE_API_BASE}?KEY=${encodeURIComponent(key)}&LOOKUP=${encodeURIComponent(cleanDomain)}`;
    res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch (e) {
    return {
      available: false,
      domain: cleanDomain,
      groups: [],
      note: `No se pudo contactar BuiltWith (timeout o red): ${String(e)}`,
    };
  }

  if (!res.ok) {
    return { available: false, domain: cleanDomain, groups: [], note: `BuiltWith respondió HTTP ${res.status}.` };
  }

  const json = (await res.json()) as BuiltWithResponse;
  if (json.Errors?.length) {
    return {
      available: false,
      domain: cleanDomain,
      groups: [],
      note: json.Errors[0]?.Message ?? "BuiltWith devolvió un error.",
    };
  }

  const groups: TechStackGroup[] = (json.free1?.groups ?? [])
    .filter((g) => (g.live ?? 0) > 0)
    .map((g) => ({
      name: g.name ?? "desconocido",
      activeTechnologies: g.live ?? 0,
      categories: (g.categories ?? []).filter((c) => (c.live ?? 0) > 0).map((c) => c.name ?? "").filter(Boolean),
    }));

  return { available: true, domain: cleanDomain, groups };
}
