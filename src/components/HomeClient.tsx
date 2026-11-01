"use client";

import { useRef, useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { MenuShowcase } from "@/components/MenuShowcase";
import type { BusinessInfo } from "@/lib/db/business";
import type { MenuItem } from "@/lib/db/menu";
import type { ChatTurn, DisplayMessage } from "@/lib/chat/types";
import { selectConversationHooks, type ConversationHook } from "@/lib/services/conversationHooks";
import type { PaymentMethod } from "@/lib/db/orders";

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
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const historyRef = useRef<ChatTurn[]>([]);
  const paymentPromptOrderIdRef = useRef<string | null>(null);

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

  /** Chequea si hay un pedido esperando método de pago y muestra los botones una sola vez por pedido. */
  async function checkPendingOrderForPaymentPrompt() {
    try {
      const res = await fetch(`/api/order/pending?conversationId=${conversationId}`);
      const data = await res.json();
      const pending = data.pending as { orderId: string; step: string } | null;
      if (pending?.step === "awaiting_payment" && paymentPromptOrderIdRef.current !== pending.orderId) {
        paymentPromptOrderIdRef.current = pending.orderId;
        setMessages((prev) => [...prev, { id: nextId(), kind: "payment_choice" }]);
      }
    } catch {
      // No crítico: si falla, el cliente puede igual escribir el método de pago en texto.
    }
  }

  /**
   * Camino único de envío: lo usan tanto el input de texto como los botones de pago
   * (misma función, mismo efecto — el agente interpreta igual "Pago en efectivo" tipeado
   * o clickeado).
   */
  async function sendTextMessage(text: string) {
    if (!text || loading || !conversationId) return;

    setMessages((prev) => [...prev, { id: nextId(), kind: "text", role: "user", content: text }]);
    setLoading(true);

    const reply = await askAgent(text);
    setMessages((prev) => [...prev, { id: nextId(), kind: "text", role: "assistant", content: reply }]);
    setLoading(false);
    await checkPendingOrderForPaymentPrompt();
  }

  async function sendMessage() {
    const text = input.trim();
    setInput("");
    await sendTextMessage(text);
  }

  /**
   * Efecto determinístico del click, igual que handleSelectFromShowcase: no depende
   * de que el LLM llame set_payment_method, el click lo aplica directo y el agente
   * solo reacciona después.
   */
  async function handleChoosePayment(method: PaymentMethod, label: string) {
    if (loading || !conversationId) return;

    setMessages((prev) => [...prev, { id: nextId(), kind: "text", role: "user", content: label }]);
    setLoading(true);

    try {
      const res = await fetch("/api/order/payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, method }),
      });
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            kind: "text",
            role: "assistant",
            content: "No pude registrar el método de pago, probá de nuevo.",
          },
        ]);
        return;
      }

      const eventNote =
        `[EVENTO_PAGO] El cliente eligió "${label}" desde los botones (el pedido ya se ` +
        `actualizó, NO llames set_payment_method de nuevo). Cerrá el pedido con un mensaje ` +
        `breve de agradecimiento y resumen (dirección + método de pago).`;
      const reply = await askAgent(eventNote);
      setMessages((prev) => [...prev, { id: nextId(), kind: "text", role: "assistant", content: reply }]);
    } finally {
      setLoading(false);
    }
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
      setShowcaseOpen(false);
      setLoading(true);

      const eventNote = buildShowcaseEventMessage(item);
      const reply = await askAgent(eventNote);
      setMessages((prev) => [...prev, { id: nextId(), kind: "text", role: "assistant", content: reply }]);
      await checkPendingOrderForPaymentPrompt();
    } finally {
      setPendingItemId(null);
      setLoading(false);
    }
  }

  return (
    <div className="relative flex flex-1 w-full max-w-2xl flex-col px-4 py-6">
      <div className="flex-1 flex flex-col rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950 md:h-[calc(100vh-13rem)]">
        <ChatPanel
          messages={messages}
          loading={loading}
          input={input}
          onInputChange={setInput}
          onSubmit={sendMessage}
          onChoosePayment={handleChoosePayment}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowcaseOpen(true)}
        className="fixed bottom-6 right-6 z-30 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-lg transition-opacity hover:opacity-90 dark:bg-white dark:text-black"
      >
        Ver menú 🍽
      </button>

      <div
        role="presentation"
        onClick={() => setShowcaseOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          showcaseOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-sm overflow-y-auto bg-white p-5 shadow-xl transition-transform duration-300 dark:bg-zinc-950 ${
          showcaseOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Menú
          </h2>
          <button
            type="button"
            onClick={() => setShowcaseOpen(false)}
            className="text-sm text-zinc-500 hover:text-black dark:hover:text-white"
          >
            Cerrar ✕
          </button>
        </div>
        <MenuShowcase onSelectItem={handleSelectFromShowcase} disabledItemId={pendingItemId} />
      </aside>
    </div>
  );
}
