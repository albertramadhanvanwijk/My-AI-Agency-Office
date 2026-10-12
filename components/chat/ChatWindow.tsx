"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bot, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { MessageInput } from "./MessageInput";

export type ChatMessage = {
  id: string;
  content: string;
  senderType: "human" | "ai_staff";
  senderId: string;
  createdAt: string | Date;
  conversationId: string;
};

function formatTime(d: string | Date) {
  try {
    return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function ChatWindow({
  conversationId,
  initialMessages,
  currentUserId,
  onSend,
}: {
  conversationId: string;
  initialMessages: ChatMessage[];
  currentUserId: string;
  onSend: (content: string) => Promise<void>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, conversationId]);

  // typing indicator from peers
  const [typing, setTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // realtime: per-conversation room — join on open, scoped message:new + user:typing
  useEffect(() => {
    let offMsg: (() => void) | undefined;
    let offTyping: (() => void) | undefined;
    let mounted = true;
    (async () => {
      try {
        const { joinConversation, leaveConversation, onMessageNew, onTyping } = await import("@/lib/realtime/client");
        joinConversation(conversationId);
        offMsg = onMessageNew((raw: unknown) => {
          if (!mounted) return;
          const msg = raw as ChatMessage;
          if (msg.conversationId !== conversationId) return;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        });
        offTyping = onTyping((d) => {
          if (d.conversationId !== conversationId) return;
          if (d.isTyping) {
            setTyping(true);
          } else {
            setTyping(false);
          }
        });
      } catch {
        // realtime optional
      }
    })();
    return () => {
      mounted = false;
      offMsg?.();
      offTyping?.();
      import("@/lib/realtime/client").then(({ leaveConversation }) => leaveConversation(conversationId)).catch(() => {});
    };
  }, [conversationId]);

  // Input typing emit with 3s debounce to false (used by ChatWindow when paired with a typing-aware input)
  // Expose via data attr callback on textarea if needed; MessageInput currently owns the textarea.
  // We keep a typed-broadcast helper attached to the window so an upgraded MessageInput can call it.
  const emitTypingTrue = useCallback(() => {
    import("@/lib/realtime/client").then(({ emitTyping }) => emitTyping(conversationId, true)).catch(() => {});
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      import("@/lib/realtime/client").then(({ emitTyping }) => emitTyping(conversationId, false)).catch(() => {});
    }, 3000);
  }, [conversationId]);

  // Notify on typing when messages state not used: hook MessageInput via custom event
  useEffect(() => {
    const handler = () => emitTypingTrue();
    window.addEventListener("chat:typing", handler as EventListener);
    return () => window.removeEventListener("chat:typing", handler as EventListener);
  }, [emitTypingTrue]);

  const [loading, setLoading] = useState(false);

  async function handleSend(content: string) {
    setLoading(true);
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      content,
      senderType: "human",
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      conversationId,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      await onSend(content);
      // on success, server will broadcast; optimistic will be replaced on next fetch,
      // but we keep it — dedup by content+sender for now: remove temp and let WS add real
      // For dashboard chat we rely on POST response not needed; we just remove optimistic after short delay
      // and expect WS to deliver. As fallback, refetch.
      const res = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) setMessages(data.messages);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex-1 overflow-auto p-4 space-y-3 bg-slate-50/50">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12">No messages yet — say hello!</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={cn("flex gap-2", mine ? "flex-row-reverse" : "flex-row")}>
                <Avatar className="w-7 h-7 shrink-0">
                  {m.senderType === "ai_staff" ? (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  ) : (
                    <AvatarFallback className="text-xs">{m.senderId.slice(0, 1).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-3 py-2 text-sm",
                    mine ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-white border border-slate-200 rounded-tl-none"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={cn("text-[11px] mt-1", mine ? "text-primary-foreground/70" : "text-slate-400")}>
                    {formatTime(m.createdAt)}
                    {m.id.startsWith("temp-") && " ⏳"}
                  </p>
                </div>
              </div>
            );
          })
        )}
        {typing && (
          <div className="flex gap-2 items-center text-xs text-slate-400 px-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
            <span>Someone is typing…</span>
          </div>
        )}
        <div ref={bottomRef} />
        {loading && (
          <div className="flex justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        )}
      </div>
      <MessageInput onSend={handleSend} onTyping={emitTypingTrue} />
    </div>
  );
}
