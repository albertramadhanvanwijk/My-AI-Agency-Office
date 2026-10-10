import { z } from "zod";

export const ProjectStatus = z.enum([
  "INQUIRY",
  "BRIEF",
  "PLANNING",
  "EXECUTION",
  "QA",
  "DELIVERY",
  "CLOSING",
]);

export const TaskStatus = z.enum(["todo", "progress", "review", "done"]);

export const ProposalType = z.enum(["division", "role", "room"]);
export const ProposalStatus = z.enum(["pending", "approved", "rejected"]);

export const ProjectSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  title: z.string(),
  brief: z.string(),
  status: ProjectStatus,
  provisionalDivisionId: z.string().nullable(),
  divisionIds: z.array(z.string()),
  briefApprovedByOwner: z.boolean().default(false),
  briefApprovedByClient: z.boolean().default(false),
  planApprovedByOwner: z.boolean().default(false),
  planApprovedByClient: z.boolean().default(false),
  revisionCount: z.number().default(0),
  maxRevisions: z.number().default(2),
  timeline: z.any().nullable(),
  budget: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  assigneeStaffId: z.string().nullable(),
  assigneeRoleId: z.string().nullable(),
  stage: z.string(),
  status: TaskStatus,
  payload: z.any().nullable(),
  resultAssetUrl: z.string().nullable(),
  parentTaskId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
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

export const CreateProjectInput = z.object({
  clientId: z.string(),
  title: z.string().min(3),
  brief: z.string().min(10),
});

export const ApproveGateInput = z.object({
  projectId: z.string(),
  gate: z.enum(["brief", "plan"]),
  approver: z.enum(["owner", "client"]),
});

export const DispatchTaskInput = z.object({
  taskId: z.string(),
  roleId: z.string(),
});

export const RevisionInput = z.object({
  projectId: z.string(),
  reason: z.string().min(5),
});

export type ProjectStatusType = z.infer<typeof ProjectStatus>;
export type TaskStatusType = z.infer<typeof TaskStatus>;
export type ProposalTypeType = z.infer<typeof ProposalType>;
export type ProposalStatusType = z.infer<typeof ProposalStatus>;
export type Project = z.infer<typeof ProjectSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Proposal = z.infer<typeof ProposalSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;
export type ApproveGateInput = z.infer<typeof ApproveGateInput>;
export type DispatchTaskInput = z.infer<typeof DispatchTaskInput>;
export type RevisionInput = z.infer<typeof RevisionInput>;