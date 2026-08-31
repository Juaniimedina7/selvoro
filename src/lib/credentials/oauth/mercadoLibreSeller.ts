import type { OAuthCredentialProvider, OAuthTokenSet } from "@/lib/credentials/providers";

// OAuth de Mercado Libre para que el usuario conecte SU cuenta de ML —
// NO hace falta que sea una cuenta vendedora/con tienda activa: cualquier
// cuenta de ML sirve, porque ML dejó de aceptar /sites/{site}/search sin un
// access token ligado a un usuario real (confirmado: un token app-only vía
// client_credentials es rechazado por ese endpoint, HTTP 403). Este mismo
// credential alimenta tanto mercadolibre_seller_snapshot (publicaciones
// propias, si las hay) como el fallback de collectMercadoLibre cuando no hay
// ML_ACCESS_TOKEN de servidor (ver src/lib/pipeline.ts). access_token dura
// 6hs (21600s); refresh_token dura 6 meses y es de UN SOLO USO — cada
// refresh devuelve uno nuevo que hay que persistir de inmediato, el
// anterior queda inválido.

const AUTH_BASE = "https://auth.mercadolibre.com.ar/authorization";
const TOKEN_URL = "https://api.mercadolibre.com/oauth/token";

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  user_id?: number;
  refresh_token?: string;
  error?: string;
  message?: string;
}

interface MeResponse {
  nickname?: string;
}

function expiresAtFrom(expiresInSeconds: number | undefined): string | undefined {
  if (!expiresInSeconds) return undefined;
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

async function fetchNickname(accessToken: string, userId: string): Promise<string> {
  try {
    const res = await fetch(`https://api.mercadolibre.com/users/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return `Vendedor ${userId}`;
    const json = (await res.json()) as MeResponse;
    return json.nickname ?? `Vendedor ${userId}`;
  } catch {
    return `Vendedor ${userId}`;
  }
}

async function requestToken(body: Record<string, string>): Promise<OAuthTokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(body).toString(),
    signal: AbortSignal.timeout(15000),
  });

  const json = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || !json.access_token || !json.user_id) {
    throw new Error(json.message ?? `Mercado Libre rechazó la solicitud de token (HTTP ${res.status}).`);
  }

  const userId = String(json.user_id);
  const accountLabel = await fetchNickname(json.access_token, userId);

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: expiresAtFrom(json.expires_in),
    externalAccountId: userId,
    accountLabel,
  };
}

export const mercadoLibreSellerProvider: OAuthCredentialProvider = {
  authType: "oauth",
  id: "mercadolibre_seller",
  label: "Mercado Libre",
  description:
    "Conectá cualquier cuenta de Mercado Libre (no hace falta que tengas tienda ni publicaciones activas) — Mercado Libre exige un login real para poder buscar, así que esto también habilita la búsqueda pública que usa analyze_product cuando no hay un token de servidor configurado. Si además vendés, trae tus propias publicaciones.",
  helpUrl: "https://developers.mercadolibre.com.ar/es_ar/autenticacion-y-autorizacion",
  authorizeUrl: (state, redirectUri) => {
    const clientId = process.env.MERCADOLIBRE_SELLER_CLIENT_ID;
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId ?? "",
      redirect_uri: redirectUri,
      state,
      // offline_access es obligatorio para que ML devuelva refresh_token
      // (si no, el access token de 6hs no se puede renovar solo).
      scope: "offline_access read",
    });
    return `${AUTH_BASE}?${params.toString()}`;
  },
  exchangeCode: async (code, redirectUri) => {
    const clientId = process.env.MERCADOLIBRE_SELLER_CLIENT_ID;
    const clientSecret = process.env.MERCADOLIBRE_SELLER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Falta configurar MERCADOLIBRE_SELLER_CLIENT_ID/MERCADOLIBRE_SELLER_CLIENT_SECRET en el servidor.");
    }
    return requestToken({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });
  },
  refresh: async (refreshToken) => {
    const clientId = process.env.MERCADOLIBRE_SELLER_CLIENT_ID;
    const clientSecret = process.env.MERCADOLIBRE_SELLER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Falta configurar MERCADOLIBRE_SELLER_CLIENT_ID/MERCADOLIBRE_SELLER_CLIENT_SECRET en el servidor.");
    }
    return requestToken({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });
  },
};
