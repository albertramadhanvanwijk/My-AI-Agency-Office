import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus } from "lucide-react";
import { ChatList } from "@/components/chat/ChatList";
import { listConversationsForUser } from "@/modules/chat/service";

export const dynamic = "force-dynamic";

export default async function ChatInboxPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user?.id) redirect("/login");
  // OWNER via middleware — but also guard here
  if (user.role !== "OWNER") redirect("/portal");

  const conversations = await listConversationsForUser(user.id);

  const items = conversations.map((c: any) => ({
    id: c.id,
    type: c.type as "project" | "direct",
    title: c.title ?? null,
    projectId: c.projectId ?? null,
    participantIds: (c.participantIds as string[]) ?? [],
    updatedAt: c.updatedAt,
    lastMessage: c.messages?.[0] ? { content: c.messages[0].content as string } : null,
  }));

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" /> Chat
        </h1>
        <Link href="/projects">
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4" /> New chat from project
          </Button>
        </Link>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <ChatList conversations={items} />
      </div>
      <p className="text-xs text-slate-500">
        Conversations are filtered by participantIds — you only see chats you are in.
      </p>
    </div>
  );
}
