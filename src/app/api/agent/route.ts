import { NextRequest, NextResponse } from "next/server";
import { runMenuAgent, type ChatTurn } from "@/lib/agent/menuAgent";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body?.message;
  const history: ChatTurn[] = Array.isArray(body?.history) ? body.history : [];
  const conversationId = body?.conversationId;

  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message_required" }, { status: 400 });
  }
  if (typeof conversationId !== "string" || !conversationId) {
    return NextResponse.json({ error: "conversationId_required" }, { status: 400 });
  }

  try {
    const reply = await runMenuAgent(message, history, conversationId);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error(JSON.stringify({ event: "[menu-agent] error", error: String(error) }));
    return NextResponse.json({ error: "agent_failed" }, { status: 500 });
  }
}
