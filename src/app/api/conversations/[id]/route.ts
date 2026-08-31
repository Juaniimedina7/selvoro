import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getConversation } from "@/lib/conversations/queries";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Necesitás iniciar sesión.", { status: 401 });
  }
  const { id } = await params;
  const conversation = await getConversation(userId, id);
  if (!conversation) {
    return new NextResponse("Conversación no encontrada.", { status: 404 });
  }
  return NextResponse.json(conversation);
}
