import type { OAuthCredentialProvider, OAuthTokenSet } from "@/lib/credentials/providers";

// OAuth de Tienda Nube (aplicación "independiente" — NO hace falta NubeSDK,
// eso es solo para apps embebidas en el admin de TN vía iframe). El
// redirect_uri NO se pasa dinámicamente: se registra una vez en el panel de
// partner al crear la app (dev.tiendanube.com), apuntando a
// /api/settings/credentials/tienda_nube/callback. El access token no expira
// (se invalida solo si el usuario desinstala la app).

const API_VERSION = "2025-03";
const USER_AGENT = "Selvoro (soporte@selvoro.app)";

interface TokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  user_id?: number | string;
}

interface StoreResponse {
  name?: { es?: string; pt?: string; en?: string } | string;
}

export const tiendaNubeProvider: OAuthCredentialProvider = {
  authType: "oauth",
  id: "tienda_nube",
  label: "Tienda Nube",
  description:
    "Conectá tu tienda para traer datos reales (productos, pedidos) en vez de proxies de mercado. Requiere tener una tienda activa en Tienda Nube.",
  helpUrl: "https://dev.tiendanube.com/docs/applications/authentication",
  authorizeUrl: (state) => {
    const appId = process.env.TIENDANUBE_CLIENT_ID;
    return `https://www.tiendanube.com/apps/${appId}/authorize?state=${encodeURIComponent(state)}`;
  },
  exchangeCode: async (code): Promise<OAuthTokenSet> => {
    const clientId = process.env.TIENDANUBE_CLIENT_ID;
    const clientSecret = process.env.TIENDANUBE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Falta configurar TIENDANUBE_CLIENT_ID/TIENDANUBE_CLIENT_SECRET en el servidor.");
    }

    const res = await fetch("https://www.tiendanube.com/apps/authorize/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`Tienda Nube rechazó el intercambio de código (HTTP ${res.status}).`);
    }
    const json = (await res.json()) as TokenResponse;
    if (!json.access_token || !json.user_id) {
      throw new Error("Tienda Nube no devolvió access_token/user_id.");
    }

    const storeId = String(json.user_id);
    let accountLabel = `Tienda ${storeId}`;
    try {
      const storeRes = await fetch(`https://api.tiendanube.com/${API_VERSION}/${storeId}/store`, {
        headers: { Authorization: `Bearer ${json.access_token}`, "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(10000),
      });
      if (storeRes.ok) {
        const store = (await storeRes.json()) as StoreResponse;
        const name = typeof store.name === "string" ? store.name : store.name?.es ?? store.name?.pt ?? store.name?.en;
        if (name) accountLabel = name;
      }
    } catch {
      // no crítico: si falla, nos quedamos con el label genérico
    }

    return {
      accessToken: json.access_token,
      externalAccountId: storeId,
      accountLabel,
      // sin expiresAt: Tienda Nube no expira el token.
    };
  },
};

export { API_VERSION as TIENDANUBE_API_VERSION, USER_AGENT as TIENDANUBE_USER_AGENT };
