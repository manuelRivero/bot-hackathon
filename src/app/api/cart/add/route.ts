import { NextRequest, NextResponse } from "next/server";
import { addItemToCart } from "@/lib/services/cart";

/**
 * Efecto determinístico: click en la vitrina. No pasa por el LLM —
 * se refleja al instante, la reacción conversacional se pide por separado.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conversationId, itemId, quantity } = body ?? {};

  if (typeof conversationId !== "string" || !conversationId) {
    return NextResponse.json({ error: "conversationId_required" }, { status: 400 });
  }
  if (typeof itemId !== "string" || !itemId) {
    return NextResponse.json({ error: "itemId_required" }, { status: 400 });
  }

  const result = await addItemToCart(conversationId, itemId, quantity ?? 1);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ cart: result.cart });
}
