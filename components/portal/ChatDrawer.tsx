"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Paperclip, Loader2, Bot, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { connectPresence, onStaffStatus } from "@/lib/realtime/client";
import { format } from "date-fns";

interface Message {
  id: string;
  content: string;
  senderType: "human" | "ai_staff";
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  createdAt: string;
  isOptimistic?: boolean;
  conversationId: string;
}

interface Conversation {
  id: string;
  projectId?: string | null;
  type: "project" | "direct";
  title?: string | null;
  participantIds: string[];
  messages: Message[];
}

interface ChatDrawerProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatDrawer({ projectId, isOpen, onClose }: ChatDrawerProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<ReturnType<typeof connectPresence> | null>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === "function") {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Fetch conversation and messages on mount
  useEffect(() => {
    if (!isOpen) return;

    const fetchConversation = async () => {
      try {
        // Get current user from session (in real app, this would come from auth context)
        // For now, we'll get it from the first API call
        const res = await fetch(`/api/portal/conversations?projectId=${projectId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.conversation) {
            setConversation(data.conversation);
            setMessages(data.conversation.messages || []);
            // Set current user ID from session (mock for now)
            setCurrentUserId(data.currentUserId || "");
          }
        }
      } catch (e) {
        console.error("Failed to fetch conversation:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [isOpen, projectId]);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (!isOpen || !conversation) return;

    // Connect to socket
    const socket = connectPresence();
    socketRef.current = socket;

    // Listen for new messages
    socket.on("message:new", (newMessage: Message) => {
      if (newMessage.conversationId === conversation.id) {
        setMessages(prev => [...prev, newMessage]);
      }
    });

    // Listen for typing indicators
    socket.on("user:typing", (data: { userId: string; userName: string; conversationId: string }) => {
      if (data.conversationId === conversation.id && data.userId !== currentUserId) {
        setTypingUsers(prev => new Set(prev).add(data.userId));
        // Clear typing indicator after 3 seconds
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(data.userId);
            return next;
          });
        }, 3000);
      }
    });

    // Join conversation room
    socket.emit("conversation:join", { conversationId: conversation.id });

    return () => {
      socket.off("message:new");
      socket.off("user:typing");
      socket.emit("conversation:leave", { conversationId: conversation.id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [isOpen, conversation, currentUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || sending || !conversation) return;

    const content = inputValue.trim();
    setInputValue("");
    setSending(true);

    // Optimistic update
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content,
      senderType: "human",
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      conversationId: conversation.id,
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const res = await fetch(`/api/portal/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          content,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();
      
      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(m => m.id === optimisticMessage.id ? data.message : m)
      );
    } catch (e) {
      console.error("Failed to send message:", e);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (!conversation || !socketRef.current) return;
    
    socketRef.current.emit("user:typing", {
      conversationId: conversation.id,
      userId: currentUserId,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    handleTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as unknown as React.FormEvent);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div className="relative flex h-full w-96 max-w-[90vw] flex-col bg-white shadow-xl ml-auto animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {conversation?.title || `Project Chat`}
              </h3>
              <p className="text-xs text-slate-500">
                {conversation?.type === "project" ? "Project conversation" : "Direct message"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <MessageSquare className="w-12 h-12 mb-4" />
                <p className="text-center">No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.senderId === currentUserId ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {message.senderType === "ai_staff" ? (
                        <Bot className="w-5 h-5 text-primary" />
                      ) : (
                        <AvatarFallback>
                          {message.senderName?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2",
                        message.senderId === currentUserId
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-slate-100 text-slate-900 rounded-tl-none"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className={cn(
                        "text-xs mt-1",
                        message.senderId === currentUserId ? "text-primary-foreground/70" : "text-slate-500"
                      )}>
                        {format(new Date(message.createdAt), "HH:mm")}
                        {message.isOptimistic && " ⏳"}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Typing indicator */}
                {typingUsers.size > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 animate-pulse">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span>
                      {Array.from(typingUsers).length === 1 
                        ? "Someone is typing..." 
                        : `${typingUsers.size} people are typing...`}
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="border-t border-slate-200 p-4">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
              <Paperclip className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <textarea
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="w-full min-h-[44px] max-h-32 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                disabled={sending}
              />
            </div>
            <Button type="submit" disabled={!inputValue.trim() || sending} size="icon" aria-label="Send message">
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}