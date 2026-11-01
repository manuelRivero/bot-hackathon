import type { PaymentMethod } from "@/lib/db/orders";

export function PaymentChoiceButtons({
  disabled,
  onChoose,
}: {
  disabled: boolean;
  onChoose: (method: PaymentMethod, label: string) => void;
}) {
  return (
    <div className="flex gap-2 self-start">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChoose("cash", "Pago en efectivo")}
        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:border-black disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-white"
      >
        💵 Efectivo
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChoose("online", "Pago online")}
        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:border-black disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-white"
      >
        💳 Pago online
      </button>
    </div>
  );
}
