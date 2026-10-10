import { z } from "zod";

export const ProposalType = z.enum(["division", "role", "room"]);
export const ProposalStatus = z.enum(["pending", "approved", "rejected"]);

export const DivisionProposalPayload = z.object({
  name: z.string().min(2).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  icon: z.string().min(1).max(50),
  description: z.string().optional(),
  triggerProjectId: z.string(),
});

export const RoleProposalPayload = z.object({
  divisionId: z.string(),
  title: z.string().min(2).max(100),
  level: z.enum(["HEAD", "MANAGER", "STAFF", "SUPPORT"]),
  systemPrompt: z.string().optional(),
  modelVia9Router: z.string().optional(),
  tools: z.array(z.string()).optional(),
  reportsToRoleId: z.string().optional(),
});

export const RoomProposalPayload = z.object({
  divisionId: z.string(),
  type: z.enum(["division", "meeting"]),
  capacity: z.number().int().positive().optional(),
  preferredPosition: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const ProposalPayload = z.union([
  DivisionProposalPayload,
  RoleProposalPayload,
  RoomProposalPayload,
]);

export const CreateProposalInput = z.object({
  type: ProposalType,
  payload: ProposalPayload,
  triggerProjectId: z.string().optional(),
});

export const ApproveInput = z.object({
  proposalId: z.string(),
  approverId: z.string(),
});

export const RejectInput = z.object({
  proposalId: z.string(),
  reason: z.string().min(5).max(500),
});

export const ProposalSchema = z.object({
  id: z.string(),
  type: ProposalType,
  triggerProjectId: z.string().nullable(),
  payload: z.any(),
  status: ProposalStatus,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProposalTypeType = z.infer<typeof ProposalType>;
export type ProposalStatusType = z.infer<typeof ProposalStatus>;
export type DivisionProposalPayloadType = z.infer<typeof DivisionProposalPayload>;
export type RoleProposalPayloadType = z.infer<typeof RoleProposalPayload>;
export type RoomProposalPayloadType = z.infer<typeof RoomProposalPayload>;
export type ProposalPayloadType = z.infer<typeof ProposalPayload>;
export type CreateProposalInputType = z.infer<typeof CreateProposalInput>;
export type ApproveInputType = z.infer<typeof ApproveInput>;
export type RejectInputType = z.infer<typeof RejectInput>;
export type Proposal = z.infer<typeof ProposalSchema>;