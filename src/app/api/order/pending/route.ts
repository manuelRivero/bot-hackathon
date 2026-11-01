import { NextRequest, NextResponse } from "next/server";
import { getPendingOrder } from "@/lib/services/orderFulfillment";

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json({ error: "conversationId_required" }, { status: 400 });
  }

  const pending = await getPendingOrder(conversationId);
  if (!pending) {
    return NextResponse.json({ pending: null });
  }

  return NextResponse.json({ pending: { orderId: pending.order.id, step: pending.step } });
}
