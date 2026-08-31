import { prisma } from "@/lib/db/prisma";
import type { ChatMessage } from "@/lib/conversations/persist";

export async function listConversations(clerkUserId: string) {
  return prisma.conversation.findMany({
    where: { clerkUserId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
}

export async function getConversation(
  clerkUserId: string,
  id: string,
): Promise<{ id: string; title: string | null; messages: ChatMessage[] } | null> {
  const row = await prisma.conversation.findFirst({
    where: { id, clerkUserId },
    select: { id: true, title: true, messages: true },
  });
  if (!row) return null;
  return { id: row.id, title: row.title, messages: row.messages as unknown as ChatMessage[] };
}
