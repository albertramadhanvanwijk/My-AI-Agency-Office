import { db } from "@/lib/db";
import { emitPresence } from "@/lib/realtime/server";
import {
  CreateProposalInputType,
  ApproveInputType,
  RejectInputType,
  ProposalTypeType,
  ProposalStatusType,
} from "./schema";

export async function createProposal(input: CreateProposalInputType) {
  const validated = {
    type: input.type,
    triggerProjectId: input.triggerProjectId ?? null,
    payload: input.payload,
    status: "pending" as ProposalStatusType,
  };

  return db.proposal.create({ data: validated });
}

export async function approveProposal(proposalId: string, approverId: string) {
  const proposal = await db.proposal.findUnique({ where: { id: proposalId } });
  if (!proposal) throw new Error("Proposal not found");
  if (proposal.status !== "pending") throw new Error("Proposal already processed");

  const updated = await db.proposal.update({
    where: { id: proposalId },
    data: { status: "approved" },
  });

  await db.auditLog.create({
    data: {
      who: approverId,
      action: "approve_proposal",
      targetId: proposalId,
      modelUsed: null,
      tokens: null,
    },
  });

  return updated;
}

export async function rejectProposal(proposalId: string, reason: string) {
  const proposal = await db.proposal.findUnique({ where: { id: proposalId } });
  if (!proposal) throw new Error("Proposal not found");
  if (proposal.status !== "pending") throw new Error("Proposal already processed");

  const updated = await db.proposal.update({
    where: { id: proposalId },
    data: { status: "rejected" },
  });

  await db.auditLog.create({
    data: {
      who: "system",
      action: "reject_proposal",
      targetId: proposalId,
      modelUsed: null,
      tokens: null,
    },
  });

  return updated;
}

export async function migrateProvisional(proposalId: string) {
  const proposal = await db.proposal.findUnique({ where: { id: proposalId } });
  if (!proposal) throw new Error("Proposal not found");
  if (proposal.status !== "approved") throw new Error("Proposal not approved");
  if (proposal.type !== "division") throw new Error("Only division proposals support provisional migration");

  const payload = proposal.payload as { divisionId?: string; name: string; color: string; icon: string; description?: string; triggerProjectId: string };
  const triggerProjectId = payload.triggerProjectId;

  // Find the provisional division by ID (stored in payload.divisionId) or by name
  const provisionalDivision = await db.division.findUnique({
    where: { id: payload.divisionId ?? payload.name },
  });

  if (!provisionalDivision) throw new Error("Provisional division not found");
  if (provisionalDivision.status !== "provisional") throw new Error("Division not provisional");

  // 1. Update division status to active
  const division = await db.division.update({
    where: { id: provisionalDivision.id },
    data: { status: "active" },
  });

  // 2. Create default Room (type=division, linked to division)
  // Find max x position for division rooms to auto-assign
  const existingDivisionRooms = await db.room.findMany({
    where: { type: "division" },
    select: { x: true, w: true },
  });
  const maxX = existingDivisionRooms.reduce((max, r) => Math.max(max, r.x + r.w), 0);
  const room = await db.room.create({
    data: {
      type: "division",
      divisionId: division.id,
      x: maxX + 2, // spacing
      y: 10,
      w: 12,
      h: 16,
      capacity: 8,
      floor: 1,
    },
  });

  // 3. Create default Roles: HEAD, MANAGER, 2x STAFF
  const modelVia9Router = process.env.DEFAULT_MODEL_VIA_9ROUTER || "gpt-4o-mini";

  const headRole = await db.role.create({
    data: {
      divisionId: division.id,
      level: "HEAD",
      title: `Head of ${division.name}`,
      systemPrompt: `You are the Head of ${division.name}. Lead the division, make strategic decisions, and ensure quality delivery.`,
      modelVia9Router,
      tools: ["delegate", "review", "approve"],
    },
  });

  const managerRole = await db.role.create({
    data: {
      divisionId: division.id,
      level: "MANAGER",
      title: `${division.name} Manager`,
      systemPrompt: `You are the Manager of ${division.name}. Coordinate tasks, manage staff, and report to Head.`,
      modelVia9Router,
      tools: ["delegate", "track", "report"],
    },
  });

  const staffRole1 = await db.role.create({
    data: {
      divisionId: division.id,
      level: "STAFF",
      title: `${division.name} Specialist I`,
      systemPrompt: `You are a Specialist in ${division.name}. Execute assigned tasks with high quality.`,
      modelVia9Router,
      tools: ["execute"],
    },
  });

  const staffRole2 = await db.role.create({
    data: {
      divisionId: division.id,
      level: "STAFF",
      title: `${division.name} Specialist II`,
      systemPrompt: `You are a Specialist in ${division.name}. Execute assigned tasks with high quality.`,
      modelVia9Router,
      tools: ["execute"],
    },
  });

  // 4. Update triggerProject.divisionIds to include new division
  const project = await db.project.update({
    where: { id: triggerProjectId },
    data: { divisionIds: { push: division.id } },
  });

  // 5. Proposal status already approved from approveProposal

  await emitPresence("division:created", { divisionId: division.id, projectId: triggerProjectId });

  return {
    division,
    room,
    roles: [headRole, managerRole, staffRole1, staffRole2],
    project,
    proposal,
  };
}

export async function listProposals(status?: ProposalStatusType) {
  return db.proposal.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: {
      triggerProject: { select: { id: true, title: true } },
    },
  });
}

export async function getProposal(proposalId: string) {
  return db.proposal.findUnique({
    where: { id: proposalId },
    include: {
      triggerProject: { select: { id: true, title: true, status: true } },
    },
  });
}