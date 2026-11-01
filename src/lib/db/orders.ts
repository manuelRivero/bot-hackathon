import { randomUUID } from "crypto";
import { readJsonFile, writeJsonFile } from "./jsonStore";
import type { Cart } from "./carts";
import { cartTotal } from "./carts";

export interface Order {
  id: string;
  conversationId: string;
  customerName: string;
  items: Cart["items"];
  total: number;
  currency: string;
  createdAt: string;
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
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  await writeJsonFile("orders", orders);
  return order;
}
