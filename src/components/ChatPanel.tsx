"use client";

import { useEffect, useRef, useState } from "react";
import { CartUpdateCard } from "@/components/CartUpdateCard";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { PaymentChoiceButtons } from "@/components/PaymentChoiceButtons";
import type { DisplayMessage } from "@/lib/chat/types";
import type { PaymentMethod } from "@/lib/db/orders";

const PLACEHOLDER_SUGGESTIONS = [
  "¿Qué tienen de postre?",
  "¿A qué hora abren hoy?",
  "¿Tienen algo vegetariano?",
  "¿Qué ingredientes tiene la pizza?",
  "¿Cuál es el plato más picante?",
];

const PLACEHOLDER_INTERVAL_MS = 5000;

export function ChatPanel({
  messages,
  loading,
  input,
  onInputChange,
  onSubmit,
  onChoosePayment,
  onRestart,
}: {
  messages: DisplayMessage[];
  loading: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onChoosePayment: (method: PaymentMethod, label: string) => void;
  onRestart: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_SUGGESTIONS.length);
    }, PLACEHOLDER_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={onRestart}
          className="text-xs font-medium text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white"
        >
          ↺ Empezar de nuevo
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-3 overflow-y-auto mb-4 min-h-[400px]">
        {messages.map((m) => {
          if (m.kind === "text") {
            return (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                  m.role === "user"
                    ? "self-end whitespace-pre-wrap bg-blue-600 text-sm text-white"
                    : "self-start bg-zinc-200 text-black dark:bg-zinc-800 dark:text-zinc-50"
                }`}
              >
                {m.role === "assistant" ? <MarkdownMessage content={m.content} /> : m.content}
              </div>
            );
          }
          if (m.kind === "cart_update") {
            return <CartUpdateCard key={m.id} addedItemName={m.addedItemName} cart={m.cart} />;
          }
          return <PaymentChoiceButtons key={m.id} disabled={loading} onChoose={onChoosePayment} />;
        })}
        {loading && (
          <div className="self-start bg-zinc-200 text-black dark:bg-zinc-800 dark:text-zinc-50 rounded-2xl px-4 py-2 text-sm">
            Escribiendo…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={PLACEHOLDER_SUGGESTIONS[placeholderIndex]}
          className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-black outline-none dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
