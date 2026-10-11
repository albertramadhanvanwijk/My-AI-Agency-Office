import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateConversation, listConversationsForUser } from "@/modules/chat/service";
import { CreateConversationApiSchema } from "@/modules/chat/schema";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conversations = await listConversationsForUser(user.id);
  return NextResponse.json({ conversations });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string } | undefined;
  if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = CreateConversationApiSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const participantIds = parsed.data.participantIds?.length
    ? parsed.data.participantIds
    : [user.id];
  // ensure requester included
  if (!participantIds.includes(user.id)) participantIds.push(user.id);
  const conv = await getOrCreateConversation({
    projectId: parsed.data.projectId ?? null,
    participantIds,
    type: parsed.data.type,
    title: parsed.data.title ?? null,
  });
  return NextResponse.json({ conversation: conv }, { status: 201 });
}
