"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ChatListItem = {
  id: string;
  type: "project" | "direct";
  title: string | null;
  projectId: string | null;
  participantIds: string[];
  updatedAt: string | Date;
  lastMessage?: { content: string } | null;
};

export function ChatList({ conversations, activeId }: { conversations: ChatListItem[]; activeId?: string }) {
  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500">
        <MessageSquare className="w-10 h-10 mb-3" />
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs">Start a project or direct chat</p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-slate-100">
      {conversations.map((c) => (
        <Link
          key={c.id}
          href={`/chat/${c.id}`}
          className={cn(
            "flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors",
            c.id === activeId && "bg-primary/5"
          )}
        >
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{c.title || (c.type === "project" ? "Project Chat" : "Direct")}</p>
              <Badge variant="secondary" className="text-[10px] h-5">{c.type}</Badge>
            </div>
            <p className="text-xs text-slate-500 truncate">{c.lastMessage?.content ?? (c.projectId ? `Project ${c.projectId.slice(0, 6)}…` : c.participantIds.join(", "))}</p>
          </div>
          <span className="text-[11px] text-slate-400 shrink-0">
            {new Date(c.updatedAt).toLocaleDateString()}
          </span>
        </Link>
      ))}
    </div>
  );
}
