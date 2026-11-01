import { randomUUID } from "crypto";
import { readJsonFile, writeJsonFile } from "./jsonStore";
import type { Cart } from "./carts";
import { cartTotal } from "./carts";

export type PaymentMethod = "cash" | "online";

export interface Order {
  id: string;
  conversationId: string;
  customerName: string;
  items: Cart["items"];
  total: number;
  currency: string;
  address: string | null;
  paymentMethod: PaymentMethod | null;
  dispatched: boolean;
  createdAt: string;
}

export type PostOrderStep = "awaiting_address" | "awaiting_payment" | "done";

/**
 * Deriva el paso posterior a la confirmación del pedido. Igual que
 * getOrderStatus en carts.ts: nunca se persiste el paso, se calcula de los
 * campos reales del pedido (address / paymentMethod).
 */
export function getPostOrderStep(order: Order): PostOrderStep {
  if (!order.address) return "awaiting_address";
  if (!order.paymentMethod) return "awaiting_payment";
  return "done";
}

export async function appendOrder(cart: Cart): Promise<Order> {
  if (!cart.customerName) {
    throw new Error("cannot_create_order_without_customer_name");
  }
  const orders = await readJsonFile<Order[]>("orders");
  const order: Order = {
    id: randomUUID(),
    conversationId: cart.conversationId,
    customerName: cart.customerName,
    items: cart.items,
    total: cartTotal(cart),
    currency: cart.items[0]?.currency ?? "ARS",
    address: null,
    paymentMethod: null,
    dispatched: false,
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  await writeJsonFile("orders", orders);
  return order;
}

export async function listOrders(): Promise<Order[]> {
  const orders = await readJsonFile<Order[]>("orders");
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markOrderDispatched(orderId: string): Promise<Order> {
  const orders = await readJsonFile<Order[]>("orders");
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    throw new Error("order_not_found");
  }
  orders[index] = { ...orders[index], dispatched: true };
  await writeJsonFile("orders", orders);
  return orders[index];
}

/** El pedido más reciente de la conversación que todavía no completó address + payment. */
export async function findPendingOrder(conversationId: string): Promise<Order | null> {
  const orders = await readJsonFile<Order[]>("orders");
  const forConversation = orders
    .filter((o) => o.conversationId === conversationId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return forConversation.find((o) => getPostOrderStep(o) !== "done") ?? null;
}

export async function updateOrder(
  orderId: string,
  patch: Partial<Pick<Order, "address" | "paymentMethod">>,
): Promise<Order> {
  const orders = await readJsonFile<Order[]>("orders");
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    throw new Error("order_not_found");
  }
  orders[index] = { ...orders[index], ...patch };
  await writeJsonFile("orders", orders);
  return orders[index];
}
