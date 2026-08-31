import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { listConversations } from "@/lib/conversations/queries";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Necesitás iniciar sesión.", { status: 401 });
  }
  const conversations = await listConversations(userId);
  return NextResponse.json(conversations);
}
