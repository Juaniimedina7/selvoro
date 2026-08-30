import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCredentialProvider } from "@/lib/credentials/providers";
import { createOAuthState } from "@/lib/credentials/oauthState";

// GET /api/settings/credentials/[provider]/connect — inicia el handshake
// OAuth: arma un `state` firmado y redirige al usuario a la pantalla de
// autorización del proveedor.

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const { provider: providerId } = await params;
  const provider = getCredentialProvider(providerId);
  if (!provider || provider.authType !== "oauth") {
    return NextResponse.json({ error: "Integración desconocida o no es OAuth." }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/settings/credentials/${providerId}/callback`;
  const state = createOAuthState(userId, providerId);

  return NextResponse.redirect(provider.authorizeUrl(state, redirectUri));
}
