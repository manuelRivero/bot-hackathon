"use client";

import { useEffect, useRef } from "react";
import { CartUpdateCard } from "@/components/CartUpdateCard";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { PaymentChoiceButtons } from "@/components/PaymentChoiceButtons";
import type { DisplayMessage } from "@/lib/chat/types";
import type { PaymentMethod } from "@/lib/db/orders";

export function ChatPanel({
  messages,
  loading,
  input,
  onInputChange,
  onSubmit,
  onChoosePayment,
}: {
  messages: DisplayMessage[];
  loading: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onChoosePayment: (method: PaymentMethod, label: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
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
          placeholder="¿Qué tienen de postre?"
          className="flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
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
