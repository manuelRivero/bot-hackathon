"use client";

import { useRef, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { MenuShowcase } from "@/components/MenuShowcase";
import type { BusinessInfo } from "@/lib/db/business";
import type { MenuItem } from "@/lib/db/menu";
import type { ChatTurn, DisplayMessage } from "@/lib/chat/types";
import { selectConversationHooks, type ConversationHook } from "@/lib/services/conversationHooks";

let idCounter = 0;
const nextId = () => `msg-${++idCounter}`;

function formatHook(hook: ConversationHook): string {
  switch (hook.type) {
    case "allergen":
      return `allergen: ${hook.allergens.join(", ")}`;
    case "spice":
      return `spice: ${hook.level}`;
    case "shareable":
      return `shareable: para ${hook.servesPeople} personas`;
    case "preparation":
      return `preparation: ${hook.detail}`;
  }
}

function buildShowcaseEventMessage(item: MenuItem): string {
  const hooks = selectConversationHooks(item);
  const hooksBlock =
    hooks.length > 0
      ? `Datos relevantes para la conversación (elegí como máximo 2 para mencionar, no los vuelques todos):\n` +
        hooks.map((h) => `- ${formatHook(h)}`).join("\n")
      : "No hay datos particulares para destacar de este item.";

  return (
    `[EVENTO_VITRINA] El cliente agregó 1x "${item.name}" desde la vitrina (el carrito ya se ` +
    `actualizó, NO llames add_item_to_cart de nuevo).\n${hooksBlock}`
  );
}

function readOrCreateConversationId(): string {
  if (typeof window === "undefined") return "";
  const STORAGE_KEY = "conversationId";
  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const generated = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEY, generated);
  return generated;
}

export function HomeClient({ business }: { business: BusinessInfo }) {
  const [conversationId] = useState(readOrCreateConversationId);
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: nextId(),
      kind: "text",
      role: "assistant",
      content: `¡Hola! Soy el asistente de ${business.name}. ${business.tagline}. Elegí algo de la vitrina o contame qué se te antoja.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const historyRef = useRef<ChatTurn[]>([]);

  async function askAgent(message: string): Promise<string> {
    const history = historyRef.current;
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, conversationId }),
      });
      const data = await res.json();
      const reply = res.ok ? data.reply : "Uy, algo falló. Probá de nuevo.";
      historyRef.current = [
        ...history,
        { role: "user", content: message },
        { role: "assistant", content: reply },
      ];
      return reply;
    } catch {
      return "No pude conectar con el servidor.";
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !conversationId) return;

    setMessages((prev) => [...prev, { id: nextId(), kind: "text", role: "user", content: text }]);
    setInput("");
    setLoading(true);

    const reply = await askAgent(text);
    setMessages((prev) => [...prev, { id: nextId(), kind: "text", role: "assistant", content: reply }]);
    setLoading(false);
  }

  async function handleSelectFromShowcase(item: MenuItem) {
    if (loading || pendingItemId || !conversationId) return;
    setPendingItemId(item.id);

    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, itemId: item.id, quantity: 1 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), kind: "text", role: "assistant", content: "No pude agregarlo, probá de nuevo." },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: nextId(), kind: "cart_update", addedItemName: item.name, cart: data.cart },
      ]);
      setLoading(true);

      const eventNote = buildShowcaseEventMessage(item);
      const reply = await askAgent(eventNote);
      setMessages((prev) => [...prev, { id: nextId(), kind: "text", role: "assistant", content: reply }]);
    } finally {
      setPendingItemId(null);
      setLoading(false);
    }
  }

  return (
    <div className="grid flex-1 w-full max-w-5xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-2">
      <div className="order-2 md:order-1">
        <MenuShowcase onSelectItem={handleSelectFromShowcase} disabledItemId={pendingItemId} />
      </div>
      <div className="order-1 md:order-2 flex flex-col rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950 md:sticky md:top-6 md:h-[calc(100vh-3rem)]">
        <ChatPanel
          messages={messages}
          loading={loading}
          input={input}
          onInputChange={setInput}
          onSubmit={sendMessage}
        />
      </div>
    </div>
  );
}
