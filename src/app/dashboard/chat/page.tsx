import { ChatWindow } from "@/components/chat/ChatWindow";

export default function ChatPage() {
  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Chat con Selvoro</h1>
      <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 20px" }}>
        Analizá productos, comparalos entre AR y US, o pedile ideas — el
        agente usa las mismas fuentes que el formulario de análisis.
      </p>
      <ChatWindow />
    </>
  );
}
