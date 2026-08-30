import { NextResponse } from "next/server";
import { getCredentialProvider } from "@/lib/credentials/providers";
import { verifyOAuthState } from "@/lib/credentials/oauthState";
import { saveOAuthCredential } from "@/lib/credentials/store";

// GET /api/settings/credentials/[provider]/callback — el proveedor redirige
// acá con ?code=...&state=.... El browser sigue siendo el del usuario (misma
// sesión de Clerk que inició el connect), así que no hace falta re-chequear
// auth() más allá de validar que el `state` coincide con quien lo generó.

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: providerId } = await params;
  const provider = getCredentialProvider(providerId);
  const settingsUrl = new URL("/dashboard/settings", request.url);

  if (!provider || provider.authType !== "oauth") {
    settingsUrl.searchParams.set("error", "unknown_provider");
    return NextResponse.redirect(settingsUrl);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    settingsUrl.searchParams.set("error", "missing_code_or_state");
    return NextResponse.redirect(settingsUrl);
  }

  const verified = verifyOAuthState(state, providerId);
  if (!verified) {
    settingsUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  const redirectUri = `${url.origin}/api/settings/credentials/${providerId}/callback`;

  try {
    const tokenSet = await provider.exchangeCode(code, redirectUri);
    await saveOAuthCredential(verified.clerkUserId, providerId, tokenSet);
    settingsUrl.searchParams.set("connected", providerId);
  } catch (e) {
    console.error(`[oauth callback:${providerId}] error:`, e);
    settingsUrl.searchParams.set("error", "exchange_failed");
  }

  return NextResponse.redirect(settingsUrl);
}
