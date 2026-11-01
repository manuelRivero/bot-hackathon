"use client";

import { useEffect, useState } from "react";
import type { MenuCategory, MenuItem } from "@/lib/db/menu";

function formatPrice(value: number, currency: string) {
  return `${currency} ${value.toLocaleString("es-AR")}`;
}

export function MenuShowcase({
  onSelectItem,
  disabledItemId,
}: {
  onSelectItem: (item: MenuItem) => void;
  disabledItemId: string | null;
}) {
  const [categories, setCategories] = useState<MenuCategory[] | null>(null);

  useEffect(() => {
    fetch("/api/menu")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, []);

  if (!categories) {
    return <div className="text-sm text-zinc-400">Cargando menú…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {categories.map((category) => (
        <div key={category.id}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
            {category.name}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {category.items.map((item) => {
              const isAvailable = item.available;
              const isPending = disabledItemId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!isAvailable || isPending}
                  onClick={() => onSelectItem(item)}
                  className={`group flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                    isAvailable
                      ? "border-zinc-200 bg-white hover:border-black hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-white dark:hover:bg-zinc-800"
                      : "cursor-not-allowed border-zinc-100 bg-zinc-50 opacity-50 dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <span className="text-sm font-medium text-black dark:text-zinc-50">
                    {item.name}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {item.description}
                  </span>
                  <span className="mt-1 text-sm font-semibold text-black dark:text-zinc-50">
                    {formatPrice(item.price, item.currency)}
                  </span>
                  {!isAvailable && (
                    <span className="text-xs font-medium text-red-500">No disponible</span>
                  )}
                  {isPending && (
                    <span className="text-xs font-medium text-zinc-400">Agregando…</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
