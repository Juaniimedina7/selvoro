import { prisma } from "@/lib/db/prisma";
import { decrypt, encrypt } from "@/lib/credentials/crypto";
import { CREDENTIAL_PROVIDERS, getCredentialProvider, type OAuthTokenSet } from "@/lib/credentials/providers";

const REFRESH_SAFETY_MARGIN_MS = 60_000;

async function persist(clerkUserId: string, providerId: string, value: Record<string, string>): Promise<void> {
  const encryptedValue = encrypt(JSON.stringify(value));
  await prisma.userCredential.upsert({
    where: { clerkUserId_provider: { clerkUserId, provider: providerId } },
    update: { encryptedValue },
    create: { clerkUserId, provider: providerId, encryptedValue },
  });
}

/**
 * Devuelve el credential ya desencriptado, o null si el usuario no lo cargó.
 * Para providers OAuth con `expiresAt` vencido (o por vencer), refresca
 * automáticamente y persiste el token set nuevo antes de devolverlo — sin
 * locking distribuido (aceptable para el volumen actual; ver plan §riesgos).
 */
export async function getUserCredential(
  clerkUserId: string,
  providerId: string,
): Promise<Record<string, string> | null> {
  const row = await prisma.userCredential.findUnique({
    where: { clerkUserId_provider: { clerkUserId, provider: providerId } },
  });
  if (!row) return null;

  const value = JSON.parse(decrypt(row.encryptedValue)) as Record<string, string>;

  const provider = getCredentialProvider(providerId);
  if (provider?.authType === "oauth" && provider.refresh && value.expiresAt) {
    const expiresAt = new Date(value.expiresAt).getTime();
    if (Number.isFinite(expiresAt) && Date.now() >= expiresAt - REFRESH_SAFETY_MARGIN_MS) {
      if (!value.refreshToken) return value; // no hay forma de refrescar, devolvemos lo que hay
      const fresh = await provider.refresh(value.refreshToken);
      const freshValue = fresh as unknown as Record<string, string>;
      await persist(clerkUserId, providerId, freshValue);
      return freshValue;
    }
  }

  return value;
}

/**
 * Como getUserCredential, pero si el usuario no conectó el provider, cae a
 * un credential "de plataforma" (el que conectó el admin en
 * PLATFORM_CREDENTIALS_CLERK_USER_ID). Solo tiene sentido para fuentes cuyo
 * dato es público/de mercado y el credential es únicamente un requisito de
 * autenticación (ej. la búsqueda general de Mercado Libre) — nunca usar esto
 * para herramientas que muestran datos DE LA CUENTA conectada (ej.
 * mercadolibre_seller_snapshot, tienda_nube_snapshot), porque ahí sí importa
 * de quién es la cuenta.
 */
export async function getUserOrPlatformCredential(
  clerkUserId: string | undefined,
  providerId: string,
): Promise<Record<string, string> | null> {
  if (clerkUserId) {
    const own = await getUserCredential(clerkUserId, providerId);
    if (own) return own;
  }
  const platformUserId = process.env.PLATFORM_CREDENTIALS_CLERK_USER_ID?.trim();
  if (!platformUserId || platformUserId === clerkUserId) return null;
  return getUserCredential(platformUserId, providerId);
}

/** Valida contra provider.verify() y recién ahí guarda cifrado. Solo para providers "manual". Lanza si no valida. */
export async function setUserCredential(
  clerkUserId: string,
  providerId: string,
  value: Record<string, string>,
): Promise<void> {
  const provider = getCredentialProvider(providerId);
  if (!provider) throw new Error(`Integración desconocida: ${providerId}`);
  if (provider.authType !== "manual") {
    throw new Error(`${providerId} se conecta vía OAuth, no se puede cargar un valor manual.`);
  }

  const result = await provider.verify(value);
  if (!result.ok) throw new Error(result.message);

  await persist(clerkUserId, providerId, value);
}

/**
 * Guarda un token set ya obtenido de un intercambio OAuth exitoso — sin
 * pasar por verify() (el propio intercambio ya probó que es válido). Solo la
 * usa el callback route.
 */
export async function saveOAuthCredential(
  clerkUserId: string,
  providerId: string,
  tokenSet: OAuthTokenSet,
): Promise<void> {
  await persist(clerkUserId, providerId, tokenSet as unknown as Record<string, string>);
}

export async function deleteUserCredential(clerkUserId: string, providerId: string): Promise<void> {
  await prisma.userCredential.deleteMany({ where: { clerkUserId, provider: providerId } });
}

export interface CredentialStatus {
  provider: string;
  configured: boolean;
  maskedPreview: string | null;
}

/** Lista el estado de TODAS las integraciones registradas para un usuario (configuradas o no). NUNCA devuelve el secreto completo. */
export async function listUserCredentialStatus(clerkUserId: string): Promise<CredentialStatus[]> {
  const rows = await prisma.userCredential.findMany({ where: { clerkUserId } });
  const byProvider = new Map(rows.map((r) => [r.provider, r]));

  return CREDENTIAL_PROVIDERS.map((provider) => {
    const row = byProvider.get(provider.id);
    if (!row) return { provider: provider.id, configured: false, maskedPreview: null };

    let maskedPreview: string | null = null;
    try {
      const value = JSON.parse(decrypt(row.encryptedValue)) as Record<string, string>;
      if (value.accountLabel) {
        // nombre de tienda / nickname: no es sensible, se muestra completo
        maskedPreview = value.accountLabel;
      } else {
        const first = Object.values(value)[0] ?? "";
        maskedPreview = first.length >= 4 ? `••••${first.slice(-4)}` : "••••";
      }
    } catch {
      maskedPreview = null;
    }
    return { provider: provider.id, configured: true, maskedPreview };
  });
}
