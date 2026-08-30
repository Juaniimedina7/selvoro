import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteUserCredential, listUserCredentialStatus, setUserCredential } from "@/lib/credentials/store";
import { getCredentialProvider } from "@/lib/credentials/providers";

// Credenciales de integraciones cargadas por el usuario (BYOK) — nunca las de
// IA (ANTHROPIC_API_KEY) ni ML_ACCESS_TOKEN, esas siguen siendo del servidor.

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Necesitás iniciar sesión." }, { status: 401 });

  const statuses = await listUserCredentialStatus(userId);
  return NextResponse.json({ statuses });
}

const postSchema = z.object({
  provider: z.string().min(1),
  value: z.record(z.string(), z.string()),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Necesitás iniciar sesión." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input inválido." }, { status: 400 });
  }

  if (!getCredentialProvider(parsed.data.provider)) {
    return NextResponse.json({ error: "Integración desconocida." }, { status: 400 });
  }

  try {
    await setUserCredential(userId, parsed.data.provider, parsed.data.value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    // setUserCredential lanza con el mensaje de provider.verify() cuando el
    // token no es válido — se lo devolvemos tal cual al usuario.
    const message = e instanceof Error ? e.message : "No se pudo guardar la credencial.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

const deleteSchema = z.object({ provider: z.string().min(1) });

export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Necesitás iniciar sesión." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Input inválido." }, { status: 400 });
  }

  await deleteUserCredential(userId, parsed.data.provider);
  return NextResponse.json({ ok: true });
}
