import { NextResponse } from "next/server";
import { markOrderDispatched } from "@/lib/db/orders";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const order = await markOrderDispatched(id);
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }
}
