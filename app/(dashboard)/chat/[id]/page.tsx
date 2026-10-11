import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChatDetailClient } from "./ChatDetailClient";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string; role: string } | undefined;
  if (!user?.id) redirect("/login");
  if (user.role !== "OWNER") redirect("/portal");

  const resolvedParams = await params;
  const conversation = await db.conversation.findUnique({
    where: { id: resolvedParams.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) notFound();

  const pids = (conversation.participantIds as unknown as string[]) ?? [];
  if (!pids.includes(user.id)) {
    // do not leak existence — but spec says 403, so throw notFound with message and handle via error.tsx,
    // here we render 403 inline
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-sm text-red-600">403 — You are not a participant of this conversation.</p>
        <Link href="/chat"><Button variant="outline" className="mt-4">Back to inbox</Button></Link>
      </div>
    );
  }

  const initialMessages = (conversation.messages as Array<{
    id: string;
    content: string;
    senderType: "human" | "ai_staff";
    senderId: string;
    createdAt: Date;
    conversationId: string;
  }>).map((m) => ({
    id: m.id,
    content: m.content,
    senderType: m.senderType,
    senderId: m.senderId,
    createdAt: m.createdAt.toISOString(),
    conversationId: m.conversationId,
  }));

  return (
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-4 h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold">{conversation.title || (conversation.type === "project" ? "Project Chat" : "Direct")}</h1>
          <p className="text-xs text-slate-500">{conversation.type} · {pids.length} participants</p>
        </div>
        <Link href="/chat"><Button variant="ghost" size="sm">Back</Button></Link>
      </div>
      <div className="flex-1 min-h-0">
        <ChatDetailClient
          conversationId={conversation.id}
          initialMessages={initialMessages}
          currentUserId={user.id}
        />
      </div>
    </div>
  );
}
