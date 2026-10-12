"use client";

import { useState } from "react";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MessageInput({
  onSend,
  disabled,
  onTyping,
}: {
  onSend: (content: string) => Promise<void> | void;
  disabled?: boolean;
  onTyping?: () => void;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setValue("");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-200 p-3 bg-white">
      <Button type="button" variant="ghost" size="icon" className="text-slate-400 shrink-0" disabled={disabled}>
        <Paperclip className="w-5 h-5" />
      </Button>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onTyping?.();
          try { window.dispatchEvent(new CustomEvent("chat:typing")); } catch {}
        }}
        onKeyDown={handleKeyDown}
        placeholder="Type a message…"
        rows={1}
        className="flex-1 min-h-[44px] max-h-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        disabled={disabled || sending}
      />
      <Button type="submit" size="icon" aria-label="Send message" disabled={!value.trim() || sending || disabled}>
        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
      </Button>
    </form>
  );
}
