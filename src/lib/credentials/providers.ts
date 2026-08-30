import { verifyMetaAdsAccessToken } from "@/lib/collectors/meta-ads";

// Registro extensible de integraciones que un usuario puede cargar desde
// Configuración → Integraciones. NUNCA incluye credenciales de IA
// (ANTHROPIC_API_KEY sigue siendo del servidor) ni ML_ACCESS_TOKEN (excluido
// a propósito, sigue compartido). Sumar una integración nueva es agregar una
// entrada acá, sin tocar el schema de DB (ver UserCredential.provider).

export interface CredentialField {
  key: string;
  label: string;
  placeholder?: string;
}

export interface CredentialProvider {
  id: string;
  label: string;
  description: string;
  helpUrl: string;
  fields: CredentialField[];
  /** Valida el/los valor(es) contra la API real antes de guardar. */
  verify: (value: Record<string, string>) => Promise<{ ok: boolean; message: string }>;
}

const metaAdsProvider: CredentialProvider = {
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

export const CREDENTIAL_PROVIDERS: CredentialProvider[] = [metaAdsProvider];

export function getCredentialProvider(id: string): CredentialProvider | undefined {
  return CREDENTIAL_PROVIDERS.find((p) => p.id === id);
}
