"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateConversation, sendMessage, listMessages, listConversationsForUser } from "./service";
import type { GetOrCreateConversationInput, SendMessageInput } from "./schema";

async function requireUser() {
  const session = await getServerSession(authOptions);
  const u = session?.user as { id: string; role: string } | undefined;
  if (!u?.id) throw new Error("Unauthorized");
  return u;
}

export async function createConversationAction(input: GetOrCreateConversationInput) {
  await requireUser();
  return getOrCreateConversation(input);
}

export async function sendMessageAction(conversationId: string, input: SendMessageInput) {
  await requireUser();
  return sendMessage(conversationId, input);
}

export async function listMessagesAction(conversationId: string) {
  const u = await requireUser();
  return listMessages(conversationId, u.id);
}

export async function listConversationsAction() {
  const u = await requireUser();
  return listConversationsForUser(u.id);
}
