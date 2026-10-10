"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  createProject,
  approveGate,
  buildWBS,
  dispatchTask,
  deliver,
  requestRevision,
  closeProject,
  checkDivisionCapability,
} from "./service";
import { CreateProjectInput, ApproveGateInput, DispatchTaskInput, RevisionInput } from "./schema";
import { z } from "zod";
import { db } from "@/lib/db";

export async function createProjectAction(input: z.infer<typeof CreateProjectInput>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const parsed = CreateProjectInput.parse(input);
  const project = await createProject(parsed);
  revalidatePath("/projects");
  return project;
}

export async function approveGateAction(input: z.infer<typeof ApproveGateInput>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const parsed = ApproveGateInput.parse(input);
  const project = await approveGate(parsed.projectId, parsed.gate, parsed.approver);
  revalidatePath(`/projects/${parsed.projectId}`);
  return project;
}

export async function buildWBSAction(projectId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const result = await buildWBS(projectId);
  revalidatePath(`/projects/${projectId}`);
  return result;
}

export async function dispatchTaskAction(input: z.infer<typeof DispatchTaskInput>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const parsed = DispatchTaskInput.parse(input);
  const task = await db.task.findUnique({ where: { id: parsed.taskId } });
  const result = await dispatchTask(parsed.taskId, parsed.roleId);
  if (task) revalidatePath(`/projects/${task.projectId}`);
  return result;
}

export async function deliverAction(projectId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const result = await deliver(projectId);
  revalidatePath(`/projects/${projectId}`);
  return result;
}

export async function requestRevisionAction(input: z.infer<typeof RevisionInput>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const parsed = RevisionInput.parse(input);
  const result = await requestRevision(parsed.projectId, parsed.reason);
  revalidatePath(`/projects/${parsed.projectId}`);
  return result;
}

export async function closeProjectAction(projectId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const result = await closeProject(projectId);
  revalidatePath("/projects");
  return result;
}

export async function checkDivisionCapabilityAction(divisionName: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return checkDivisionCapability(divisionName);
}