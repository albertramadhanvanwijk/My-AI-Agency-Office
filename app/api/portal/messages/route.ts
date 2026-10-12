import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
// realtime emit is scoped per-conversation (see lib/realtime/server emitToConversation)

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: "OWNER" | "CLIENT" };
    const isOwner = user.role === "OWNER";
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const cursor = searchParams.get("cursor");

    if (!conversationId) {
      return NextResponse.json({ error: "conversationId required" }, { status: 400 });
    }

    // Verify conversation access
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { project: { select: { clientId: true } } },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const participantIds = conversation.participantIds as string[];
    if (!participantIds.includes(user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const messages = await db.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
    });

    let nextCursor: string | undefined;
    if (messages.length > limit) {
      const nextMessage = messages.pop();
      nextCursor = nextMessage!.id;
    }

    return NextResponse.json({ 
      messages: messages.reverse(),
      nextCursor,
    });
  } catch (e) {
    console.error("Failed to fetch messages:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: "OWNER" | "CLIENT"; name?: string | null };
    const body = await req.json();
    const { conversationId, content } = body;

    if (!conversationId || !content?.trim()) {
      return NextResponse.json({ error: "conversationId and content required" }, { status: 400 });
    }

    // Verify conversation access
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: { project: { select: { clientId: true } } },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const participantIds = conversation.participantIds as string[];
    if (!participantIds.includes(user.id)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create message
    const message = await db.message.create({
      data: {
        conversationId,
        senderType: "human",
        senderId: user.id,
        content: content.trim(),
      },
    });

    // Update conversation updatedAt
    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    const messageWithSender = {
      ...message,
      senderName: user.name,
    };

    // Scoped emit to conversation room; fallback to office for backwards-compat/tests
    try {
      const { emitToConversation } = await import("@/lib/realtime/server");
      emitToConversation(conversationId, "message:new", messageWithSender);
    } catch {
      const { emitPresence } = await import("@/lib/realtime/server");
      emitPresence("message:new", messageWithSender);
    }

    return NextResponse.json({ message: messageWithSender });
  } catch (e) {
    console.error("Failed to create message:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}