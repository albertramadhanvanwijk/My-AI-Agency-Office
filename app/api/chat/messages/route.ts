import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listMessages, sendMessage, ChatForbiddenError } from "@/modules/chat/service";
import { SendMessageSchema } from "@/modules/chat/schema";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  try {
    const messages = await listMessages(conversationId, user.id);
    return NextResponse.json({ messages });
  } catch (e: unknown) {
    if (e instanceof ChatForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg === "Conversation not found" ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { conversationId, content, senderType, senderId, attachments } = body as {
    conversationId?: string;
    content?: string;
    senderType?: string;
    senderId?: string;
    attachments?: unknown;
  };
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  // force senderId to session for human messages
  const parsed = SendMessageSchema.safeParse({
    content,
    senderType: senderType ?? "human",
    senderId: senderId ?? user.id,
    attachments: attachments ?? null,
  });
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  // if human, override to authenticated user
  const toSend = parsed.data.senderType === "human" ? { ...parsed.data, senderId: user.id } : parsed.data;
  try {
    const message = await sendMessage(conversationId, toSend);
    return NextResponse.json({ message }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof ChatForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const msg = e instanceof Error ? e.message : "Internal server error";
    const status = msg === "Conversation not found" ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
