import { verifyMetaAdsAccessToken } from "@/lib/collectors/meta-ads";
import { verifyApifyApiToken } from "@/lib/collectors/apify";
import { tiendaNubeProvider } from "@/lib/credentials/oauth/tiendaNube";
import { mercadoLibreSellerProvider } from "@/lib/credentials/oauth/mercadoLibreSeller";

// Registro extensible de integraciones que un usuario puede cargar desde
// Configuración → Integraciones. NUNCA incluye credenciales de IA
// (ANTHROPIC_API_KEY sigue siendo del servidor) ni ML_ACCESS_TOKEN (excluido
// a propósito, sigue compartido — es una integración DISTINTA de
// mercadolibre_seller). Sumar una integración nueva es agregar una entrada
// acá, sin tocar el schema de DB (ver UserCredential.provider).
//
// Dos formas de provider:
// - "manual": el usuario pega un valor (hoy: Meta Ad Library).
// - "oauth": flujo de redirect+callback (hoy: Tienda Nube, Mercado Libre
//   vendedor). Ver src/app/api/settings/credentials/[provider]/connect|callback.

export interface CredentialField {
  key: string;
  label: string;
  placeholder?: string;
}

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken?: string;
  /** ISO 8601. Si el provider no expira (ej. Tienda Nube), queda undefined. */
  expiresAt?: string;
  /** Nombre de tienda / nickname del vendedor, para mostrar en la UI sin descifrar de nuevo. */
  accountLabel?: string;
  /** store_id / seller user_id — lo piden casi todos los endpoints posteriores. */
  externalAccountId?: string;
}

export interface ManualCredentialProvider {
  authType: "manual";
  id: string;
  label: string;
  description: string;
  helpUrl: string;
  fields: CredentialField[];
  /** Valida el/los valor(es) contra la API real antes de guardar. */
  verify: (value: Record<string, string>) => Promise<{ ok: boolean; message: string }>;
}

export interface OAuthCredentialProvider {
  authType: "oauth";
  id: string;
  label: string;
  description: string;
  helpUrl: string;
  authorizeUrl: (state: string, redirectUri: string) => string;
  exchangeCode: (code: string, redirectUri: string) => Promise<OAuthTokenSet>;
  refresh?: (refreshToken: string) => Promise<OAuthTokenSet>;
}

export type CredentialProvider = ManualCredentialProvider | OAuthCredentialProvider;

const metaAdsProvider: ManualCredentialProvider = {
  authType: "manual",
  id: "meta_ads",
  label: "Meta Ad Library",
  description:
    "Requiere una app en Meta for Developers con el producto \"Ads Library API\" y el permiso ads_read aprobado (App Review + verificación de negocio).",
  helpUrl: "https://developers.facebook.com/docs/marketing-api/ad-library-api",
  fields: [{ key: "accessToken", label: "Access Token", placeholder: "EAAG..." }],
  verify: async (value) => {
    const token = value.accessToken?.trim();
    if (!token) return { ok: false, message: "Falta el access token." };
    return verifyMetaAdsAccessToken(token);
  },
};

const apifyProvider: ManualCredentialProvider = {
  authType: "manual",
  id: "apify",
  label: "Apify (scraper de marketplaces)",
  description:
    "Requiere una cuenta en apify.com y su API token (Console → Integrations). Habilita búsqueda de productos " +
    "en Amazon/AliExpress vía actors de Apify Store. Cada corrida de scraping tiene costo real, se cobra a tu " +
    "cuenta de Apify, no a Selvoro.",
  helpUrl: "https://docs.apify.com/api/v2",
  fields: [{ key: "apiToken", label: "API Token", placeholder: "apify_api_..." }],
  verify: async (value) => {
    const token = value.apiToken?.trim();
    if (!token) return { ok: false, message: "Falta el API token." };
    return verifyApifyApiToken(token);
  },
};

export const CREDENTIAL_PROVIDERS: CredentialProvider[] = [
  metaAdsProvider,
  apifyProvider,
  tiendaNubeProvider,
  mercadoLibreSellerProvider,
];

export function getCredentialProvider(id: string): CredentialProvider | undefined {
  return CREDENTIAL_PROVIDERS.find((p) => p.id === id);
}
