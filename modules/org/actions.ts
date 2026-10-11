"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AddRoleInput, AddDivisionInput, ToggleStaffStatusInput } from "./schema";
import { addRole, addDivision, approveProvisionalProposal, toggleStaffStatus } from "./service";

async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") throw new Error("Unauthorized: OWNER only");
  return session;
}

export async function addRoleAction(input: unknown) {
  await requireOwner();
  const parsed = AddRoleInput.parse(input);
  const role = await addRole(parsed);
  revalidatePath("/organization/roles");
  revalidatePath("/organization");
  return role;
}

export async function addDivisionAction(input: unknown) {
  await requireOwner();
  const parsed = AddDivisionInput.parse(input);
  const division = await addDivision(parsed);
  revalidatePath("/organization/divisions");
  revalidatePath("/organization");
  return division;
}

export async function approveProposalOneClickAction(proposalId: string) {
  const session = await requireOwner();
  const result = await approveProvisionalProposal(proposalId, session.user.id);
  revalidatePath("/organization/proposals");
  revalidatePath("/proposals");
  revalidatePath("/organization/divisions");
  revalidatePath("/lobby");
  return result;
}

export async function toggleStaffStatusAction(input: unknown) {
  await requireOwner();
  const parsed = ToggleStaffStatusInput.parse(input);
  const result = await toggleStaffStatus(parsed);
  revalidatePath("/organization/hr");
  revalidatePath("/lobby");
  revalidatePath("/organization");
  return result;
}
