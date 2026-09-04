import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { listConversations } from "@/lib/conversations/queries";

export default async function ChatPage() {
  const { userId } = await auth();
  // Best-effort: si la DB falla acá, mostramos el chat igual (sin historial)
  // en vez de tirar abajo la página entera.
  let conversations: Awaited<ReturnType<typeof listConversations>> = [];
  try {
    conversations = await listConversations(userId!);
  } catch (e) {
    console.error("[dashboard/chat] listConversations falló:", e);
  }

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Chat con Selvoro</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 20px" }}>
        Analizá productos, comparalos entre AR y US, o pedile ideas — el
        agente usa las mismas fuentes que el formulario de análisis.
      </p>
      <Suspense fallback={null}>
        <ChatWindow
          initialConversations={conversations.map((c) => ({
            id: c.id,
            title: c.title,
            updatedAt: c.updatedAt.toISOString(),
          }))}
        />
      </Suspense>
    </>
  );
}
