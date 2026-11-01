"use client";

import { useState } from "react";
import type { Order } from "@/lib/db/orders";
import { Modal } from "@/components/admin/Modal";

// Mismo motivo que formatDate: esta tabla se arma server-side, así que
// evitamos toLocaleString acá para no arriesgar otro mismatch de hidratación.
function formatPrice(value: number, currency: string) {
  const withThousands = Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${currency} ${withThousands}`;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

// Evita Intl.toLocaleString: Node y el navegador pueden renderizar el mismo
// valor con caracteres Unicode distintos (ej. espacio angosto vs normal en
// "p. m."), lo que React detecta como mismatch de hidratación.
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function paymentLabel(method: Order["paymentMethod"]) {
  if (method === "cash") return "Efectivo";
  if (method === "online") return "Pago online";
  return "—";
}

export function AdminOrdersTable({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchedOrder, setDispatchedOrder] = useState<Order | null>(null);

  async function handleDispatch(order: Order) {
    setDispatching(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/dispatch`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) return;

      setOrders((prev) => prev.map((o) => (o.id === order.id ? data.order : o)));
      setSelectedOrder(null);
      setDispatchedOrder(data.order);
    } finally {
      setDispatching(false);
    }
  }

  if (orders.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Todavía no hay pedidos.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {orders.map((order) => (
              <tr key={order.id} className="text-black dark:text-zinc-50">
                <td className="px-4 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                  {formatDate(order.createdAt)}
                </td>
                <td className="px-4 py-3">{order.customerName}</td>
                <td className="px-4 py-3">{order.items.length}</td>
                <td className="px-4 py-3 font-medium">{formatPrice(order.total, order.currency)}</td>
                <td className="px-4 py-3">{paymentLabel(order.paymentMethod)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      order.dispatched
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}
                  >
                    {order.dispatched ? "Despachado" : "Pendiente"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(order)}
                    className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <Modal onClose={() => setSelectedOrder(null)}>
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Pedido de {selectedOrder.customerName}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {formatDate(selectedOrder.createdAt)}
          </p>

          <div className="mt-4 flex flex-col gap-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            {selectedOrder.items.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between text-sm">
                <span>
                  {item.quantity}× {item.name}
                </span>
                <span>{formatPrice(item.unitPrice * item.quantity, item.currency)}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 text-sm font-semibold dark:border-zinc-800">
            <span>Total</span>
            <span>{formatPrice(selectedOrder.total, selectedOrder.currency)}</span>
          </div>

          <div className="mt-4 space-y-1 border-t border-zinc-100 pt-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            <p>
              <span className="font-medium text-black dark:text-zinc-50">Dirección: </span>
              {selectedOrder.address ?? "—"}
            </p>
            <p>
              <span className="font-medium text-black dark:text-zinc-50">Pago: </span>
              {paymentLabel(selectedOrder.paymentMethod)}
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-black dark:border-zinc-700 dark:text-zinc-50"
            >
              Cerrar
            </button>
            <button
              type="button"
              disabled={selectedOrder.dispatched || dispatching}
              onClick={() => handleDispatch(selectedOrder)}
              className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {selectedOrder.dispatched
                ? "Ya despachado"
                : dispatching
                  ? "Despachando…"
                  : "Despachar pedido"}
            </button>
          </div>
        </Modal>
      )}

      {dispatchedOrder && (
        <Modal onClose={() => setDispatchedOrder(null)}>
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-900/40">
              ✅
            </div>
            <h2 className="mt-3 text-lg font-semibold text-black dark:text-zinc-50">
              Pedido despachado
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              El pedido de {dispatchedOrder.customerName} fue marcado como despachado.
            </p>
            <button
              type="button"
              onClick={() => setDispatchedOrder(null)}
              className="mt-5 rounded-full bg-black px-5 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Listo
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
