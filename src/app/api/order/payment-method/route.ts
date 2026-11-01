import { NextRequest, NextResponse } from "next/server";
import { setPaymentMethod } from "@/lib/services/orderFulfillment";

/**
 * Efecto determinístico del click en los botones de pago — igual que
 * /api/cart/add con la vitrina: no depende de que el LLM recuerde llamar
 * set_payment_method, el click lo aplica directo.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conversationId, method } = body ?? {};

  if (typeof conversationId !== "string" || !conversationId) {
    return NextResponse.json({ error: "conversationId_required" }, { status: 400 });
  }
  if (method !== "cash" && method !== "online") {
    return NextResponse.json({ error: "invalid_method" }, { status: 400 });
  }

  const result = await setPaymentMethod(conversationId, method);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ order: result.order, step: result.step });
}
