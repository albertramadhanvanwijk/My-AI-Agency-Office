"use client";

import { ChatWindow } from "@/components/chat/ChatWindow";
import type { ChatMessage } from "@/components/chat/ChatWindow";

export function ChatDetailClient({
  conversationId,
  initialMessages,
  currentUserId,
}: {
  conversationId: string;
  initialMessages: ChatMessage[];
  currentUserId: string;
}) {
  async function handleSend(content: string) {
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, content }),
    });
    if (!res.ok) throw new Error("Failed to send");
  }

  return (
    <ChatWindow
      conversationId={conversationId}
      initialMessages={initialMessages}
      currentUserId={currentUserId}
      onSend={handleSend}
    />
  );
}
