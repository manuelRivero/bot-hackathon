import { getMenuItemById } from "@/lib/db/menu";
import {
  cartTotal,
  clearCart,
  getCart,
  getOrderStatus,
  saveCart,
  type Cart,
} from "@/lib/db/carts";
import { appendOrder, type Order } from "@/lib/db/orders";

export interface CartView {
  items: Cart["items"];
  customerName: string | null;
  total: number;
  currency: string | null;
  status: ReturnType<typeof getOrderStatus>;
}

export function cartView(cart: Cart): CartView {
  return {
    items: cart.items,
    customerName: cart.customerName,
    total: cartTotal(cart),
    currency: cart.items[0]?.currency ?? null,
    status: getOrderStatus(cart),
  };
}

export type AddItemResult =
  | { ok: true; cart: CartView }
  | { ok: false; error: "item_not_found" | "item_not_available" };

/**
 * Único lugar que muta "agregar item al carrito". Lo usan tanto la tool del
 * agente (add_item_to_cart) como el click determinístico de la vitrina — así
 * nunca pueden desincronizarse.
 */
export async function addItemToCart(
  conversationId: string,
  itemId: string,
  quantity: number,
): Promise<AddItemResult> {
  const menuItem = await getMenuItemById(itemId);
  if (!menuItem) {
    return { ok: false, error: "item_not_found" };
  }
  if (!menuItem.available) {
    return { ok: false, error: "item_not_available" };
  }

  const cart = await getCart(conversationId);
  const existing = cart.items.find((i) => i.itemId === itemId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({
      itemId: menuItem.id,
      name: menuItem.name,
      unitPrice: menuItem.price,
      currency: menuItem.currency,
      quantity,
    });
  }

  await saveCart(cart);
  return { ok: true, cart: cartView(cart) };
}

export type RemoveItemResult =
  | { ok: true; cart: CartView }
  | { ok: false; error: "item_not_in_cart" };

export async function removeItemFromCart(
  conversationId: string,
  itemId: string,
): Promise<RemoveItemResult> {
  const cart = await getCart(conversationId);
  const existing = cart.items.find((i) => i.itemId === itemId);
  if (!existing) {
    return { ok: false, error: "item_not_in_cart" };
  }

  cart.items = cart.items.filter((i) => i.itemId !== itemId);
  await saveCart(cart);
  return { ok: true, cart: cartView(cart) };
}

export async function setCustomerName(conversationId: string, name: string): Promise<CartView> {
  const cart = await getCart(conversationId);
  cart.customerName = name.trim();
  await saveCart(cart);
  return cartView(cart);
}

export async function getCartView(conversationId: string): Promise<CartView> {
  const cart = await getCart(conversationId);
  return cartView(cart);
}

export type ConfirmOrderResult =
  | { ok: true; order: Order }
  | { ok: false; error: "items_required" | "customer_name_required" };

export async function confirmOrder(conversationId: string): Promise<ConfirmOrderResult> {
  const cart = await getCart(conversationId);
  const status = getOrderStatus(cart);

  if (status === "empty") {
    return { ok: false, error: "items_required" };
  }
  if (status === "missing_name") {
    return { ok: false, error: "customer_name_required" };
  }

  const order = await appendOrder(cart);
  await clearCart(conversationId);
  return { ok: true, order };
}
