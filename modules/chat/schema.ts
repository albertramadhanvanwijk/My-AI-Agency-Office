import { z } from "zod";

export const ConversationTypeSchema = z.enum(["project", "direct"]);
export type ConversationType = z.infer<typeof ConversationTypeSchema>;

export const MessageSenderTypeSchema = z.enum(["human", "ai_staff"]);
export type MessageSenderType = z.infer<typeof MessageSenderTypeSchema>;

export const GetOrCreateConversationSchema = z.object({
  projectId: z.string().min(1).optional().nullable(),
  participantIds: z.array(z.string().min(1)).min(1, "at least one participant"),
  type: ConversationTypeSchema.optional(),
  title: z.string().max(200).optional().nullable(),
});
export type GetOrCreateConversationInput = z.infer<typeof GetOrCreateConversationSchema>;

export const SendMessageSchema = z.object({
  content: z.string().min(1, "content required").max(5000),
  senderType: MessageSenderTypeSchema,
  senderId: z.string().min(1),
  attachments: z.unknown().optional().nullable(),
  modelVia9Router: z.string().optional().nullable(),
});
export type SendMessageInput = z.infer<typeof SendMessageSchema>;

export const ListMessagesSchema = z.object({
  conversationId: z.string().min(1),
});

export const CreateConversationApiSchema = z.object({
  projectId: z.string().min(1).optional().nullable(),
  participantIds: z.array(z.string().min(1)).min(1).optional(),
  type: ConversationTypeSchema.optional(),
  title: z.string().max(200).optional().nullable(),
});
