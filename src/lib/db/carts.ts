import { readJsonFile, writeJsonFile } from "./jsonStore";

export interface CartItem {
  itemId: string;
  name: string;
  unitPrice: number;
  currency: string;
  quantity: number;
}

export interface Cart {
  conversationId: string;
  items: CartItem[];
  customerName: string | null;
  updatedAt: string;
}

type CartsFile = Record<string, Cart>;

function emptyCart(conversationId: string): Cart {
  return {
    conversationId,
    items: [],
    customerName: null,
    updatedAt: new Date().toISOString(),
  };
}

export async function getCart(conversationId: string): Promise<Cart> {
  const carts = await readJsonFile<CartsFile>("carts");
  return carts[conversationId] ?? emptyCart(conversationId);
}

export async function saveCart(cart: Cart): Promise<void> {
  const carts = await readJsonFile<CartsFile>("carts");
  carts[cart.conversationId] = { ...cart, updatedAt: new Date().toISOString() };
  await writeJsonFile("carts", carts);
}

export async function clearCart(conversationId: string): Promise<void> {
  const carts = await readJsonFile<CartsFile>("carts");
  delete carts[conversationId];
  await writeJsonFile("carts", carts);
}

export function cartTotal(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export type OrderStatus = "empty" | "missing_name" | "ready_to_confirm";

/**
 * Deriva el paso del pedido a partir del carrito. Única fuente de verdad del
 * estado: nunca se persiste "paso actual", se calcula siempre desde los Facts.
 */
export function getOrderStatus(cart: Cart): OrderStatus {
  if (cart.items.length === 0) return "empty";
  if (!cart.customerName) return "missing_name";
  return "ready_to_confirm";
}
