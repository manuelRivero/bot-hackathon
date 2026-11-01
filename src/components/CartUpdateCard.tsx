import type { CartView } from "@/lib/services/cart";

function formatPrice(value: number, currency: string | null) {
  return `${currency ?? ""} ${value.toLocaleString("es-AR")}`.trim();
}

export function CartUpdateCard({
  addedItemName,
  cart,
}: {
  addedItemName: string;
  cart: CartView;
}) {
  return (
    <div className="self-start w-full max-w-[85%] rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
        Agregado al carrito
      </p>
      <p className="mt-1 text-sm font-semibold text-black dark:text-zinc-50">{addedItemName}</p>

      <div className="mt-3 flex flex-col gap-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        {cart.items.map((item) => (
          <div
            key={item.itemId}
            className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400"
          >
            <span>
              {item.quantity}× {item.name}
            </span>
            <span>{formatPrice(item.unitPrice * item.quantity, item.currency)}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <span className="text-xs text-zinc-500 dark:text-zinc-500">Total</span>
        <span className="text-sm font-semibold text-black dark:text-zinc-50">
          {formatPrice(cart.total, cart.currency)}
        </span>
      </div>
    </div>
  );
}
