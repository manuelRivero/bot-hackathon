import {
  findPendingOrder,
  getPostOrderStep,
  updateOrder,
  type Order,
  type PaymentMethod,
  type PostOrderStep,
} from "@/lib/db/orders";

export interface PendingOrderView {
  order: Order;
  step: PostOrderStep;
}

export async function getPendingOrder(conversationId: string): Promise<PendingOrderView | null> {
  const order = await findPendingOrder(conversationId);
  if (!order) return null;
  return { order, step: getPostOrderStep(order) };
}

export type SetAddressResult =
  | { ok: true; order: Order; step: PostOrderStep }
  | { ok: false; error: "no_pending_order" };

/** Sin validación: es una demo, cualquier texto es una dirección válida. */
export async function setDeliveryAddress(
  conversationId: string,
  address: string,
): Promise<SetAddressResult> {
  const order = await findPendingOrder(conversationId);
  if (!order) {
    return { ok: false, error: "no_pending_order" };
  }
  const updated = await updateOrder(order.id, { address: address.trim() });
  return { ok: true, order: updated, step: getPostOrderStep(updated) };
}

export type SetPaymentMethodResult =
  | { ok: true; order: Order; step: PostOrderStep }
  | { ok: false; error: "no_pending_order" | "address_required" };

export async function setPaymentMethod(
  conversationId: string,
  method: PaymentMethod,
): Promise<SetPaymentMethodResult> {
  const order = await findPendingOrder(conversationId);
  if (!order) {
    return { ok: false, error: "no_pending_order" };
  }
  if (getPostOrderStep(order) === "awaiting_address") {
    return { ok: false, error: "address_required" };
  }
  const updated = await updateOrder(order.id, { paymentMethod: method });
  return { ok: true, order: updated, step: getPostOrderStep(updated) };
}
