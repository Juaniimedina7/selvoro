import { createHmac, timingSafeEqual } from "node:crypto";

// Firma el `state` del flujo OAuth (protección CSRF) sin necesitar una tabla
// de "authorization requests" pendientes: es un payload autocontenido y
// verificable, reusando CREDENTIALS_ENCRYPTION_KEY como secreto de firma
// (HMAC — acá no hace falta confidencialidad, solo integridad/autenticidad,
// así que HMAC alcanza, no hace falta el cifrado AES-GCM de crypto.ts).

const TTL_MS = 10 * 60 * 1000; // 10 minutos

interface StatePayload {
  clerkUserId: string;
  provider: string;
  nonce: string;
  iat: number;
}

function getSecret(): string {
  const secret = process.env.CREDENTIALS_ENCRYPTION_KEY?.trim();
  if (!secret) throw new Error("Falta CREDENTIALS_ENCRYPTION_KEY.");
  return secret;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
}

export function createOAuthState(clerkUserId: string, provider: string): string {
  const payload: StatePayload = {
    clerkUserId,
    provider,
    nonce: Math.random().toString(36).slice(2),
    iat: Date.now(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** Devuelve el payload si la firma es válida, no venció, y coincide con el provider esperado. */
export function verifyOAuthState(state: string, expectedProvider: string): { clerkUserId: string } | null {
  const [payloadB64, signature] = state.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSig = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (payload.provider !== expectedProvider) return null;
  if (Date.now() - payload.iat > TTL_MS) return null;

  return { clerkUserId: payload.clerkUserId };
}
