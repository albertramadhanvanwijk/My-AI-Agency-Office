"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  createProposal,
  approveProposal,
  rejectProposal,
  migrateProvisional,
  listProposals,
  getProposal,
} from "./service";
import type {
  CreateProposalInputType,
  ApproveInputType,
  RejectInputType,
} from "./schema";

export async function createProposalAction(input: CreateProposalInputType) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    throw new Error("Unauthorized: OWNER only");
  }

  const result = await createProposal(input);
  revalidatePath("/proposals");
  return result;
}

export async function approveProposalAction(input: ApproveInputType) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    throw new Error("Unauthorized: OWNER only");
  }

  const result = await approveProposal(input.proposalId, session.user.id);
  revalidatePath("/proposals");
  return result;
}

export async function rejectProposalAction(input: RejectInputType) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    throw new Error("Unauthorized: OWNER only");
  }

  const result = await rejectProposal(input.proposalId, input.reason);
  revalidatePath("/proposals");
  return result;
}

export async function migrateProvisionalAction(proposalId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    throw new Error("Unauthorized: OWNER only");
  }

  const result = await migrateProvisional(proposalId);
  revalidatePath("/proposals");
  revalidatePath("/lobby");
  revalidatePath("/dashboard");
  return result;
}

export async function listProposalsAction(status?: "pending" | "approved" | "rejected") {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    throw new Error("Unauthorized: OWNER only");
  }

  return listProposals(status);
}

export async function getProposalAction(proposalId: string) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    throw new Error("Unauthorized: OWNER only");
  }

  return getProposal(proposalId);
}