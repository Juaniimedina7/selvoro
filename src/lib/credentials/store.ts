import { prisma } from "@/lib/db/prisma";
import { decrypt, encrypt } from "@/lib/credentials/crypto";
import { CREDENTIAL_PROVIDERS, getCredentialProvider } from "@/lib/credentials/providers";

/** Devuelve el credential ya desencriptado, o null si el usuario no lo cargó. */
export async function getUserCredential(
  clerkUserId: string,
  providerId: string,
): Promise<Record<string, string> | null> {
  const row = await prisma.userCredential.findUnique({
    where: { clerkUserId_provider: { clerkUserId, provider: providerId } },
  });
  if (!row) return null;
  return JSON.parse(decrypt(row.encryptedValue)) as Record<string, string>;
}

/** Valida contra provider.verify() y recién ahí guarda cifrado. Lanza si no valida. */
export async function setUserCredential(
  clerkUserId: string,
  providerId: string,
  value: Record<string, string>,
): Promise<void> {
  const provider = getCredentialProvider(providerId);
  if (!provider) throw new Error(`Integración desconocida: ${providerId}`);

  const result = await provider.verify(value);
  if (!result.ok) throw new Error(result.message);

  const encryptedValue = encrypt(JSON.stringify(value));
  await prisma.userCredential.upsert({
    where: { clerkUserId_provider: { clerkUserId, provider: providerId } },
    update: { encryptedValue },
    create: { clerkUserId, provider: providerId, encryptedValue },
  });
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
      const first = Object.values(value)[0] ?? "";
      maskedPreview = first.length >= 4 ? `••••${first.slice(-4)}` : "••••";
    } catch {
      maskedPreview = null;
    }
    return { provider: provider.id, configured: true, maskedPreview };
  });
}
