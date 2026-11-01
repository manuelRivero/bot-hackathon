import { NextRequest, NextResponse } from "next/server";
import { clearCart } from "@/lib/db/carts";

/** Efecto determinístico del botón "Empezar de nuevo": borra el carrito en curso. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conversationId } = body ?? {};

  if (typeof conversationId !== "string" || !conversationId) {
    return NextResponse.json({ error: "conversationId_required" }, { status: 400 });
  }

  await clearCart(conversationId);
  return NextResponse.json({ success: true });
}
