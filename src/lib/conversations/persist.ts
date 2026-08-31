import { prisma } from "@/lib/db/prisma";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function deriveTitle(messages: ChatMessage[]): string | null {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return null;
  const text = firstUser.content.trim();
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

/**
 * Crea o actualiza el historial de una conversación. Si `id` viene, la
 * actualización está scoped por clerkUserId en la misma query (updateMany)
 * — si no matchea ninguna fila (conversación ajena o inexistente), lanza.
 * Si `id` no viene, crea una conversación nueva.
 */
export async function upsertConversationMessages(params: {
  id?: string | null;
  clerkUserId: string;
  messages: ChatMessage[];
}): Promise<{ id: string }> {
  const { id, clerkUserId, messages } = params;

  if (id) {
    const result = await prisma.conversation.updateMany({
      where: { id, clerkUserId },
      data: { messages: messages as unknown as object },
    });
    if (result.count === 0) {
      throw new Error("Conversación no encontrada para este usuario.");
    }
    return { id };
  }

  const created = await prisma.conversation.create({
    data: {
      clerkUserId,
      title: deriveTitle(messages),
      messages: messages as unknown as object,
    },
    select: { id: true },
  });
  return created;
}
