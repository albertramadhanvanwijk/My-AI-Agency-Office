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
  createTask,
} from "./service";
import { CreateProjectInput, ApproveGateInput, DispatchTaskInput, RevisionInput, CreateTaskInput } from "./schema";
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
  // Portal client guard: non-OWNER may only approve as "client" and only own project
  if (parsed.approver === "client" && (session.user as unknown as { role?: string }).role !== "OWNER") {
    const p = await db.project.findUnique({ where: { id: parsed.projectId }, include: { client: { include: { user: true } } } });
    if (!p) throw new Error("Project not found");
    const sid = (session.user as unknown as { id?: string }).id;
    const email = (session.user as unknown as { email?: string }).email;
    const ownerById = sid && p.clientId === sid;
    const ownerByEmail = !!(email && p.client?.user?.email && email === p.client.user.email);
    if (!ownerById && !ownerByEmail) throw new Error("Forbidden: not project owner");
  }
  const project = await approveGate(parsed.projectId, parsed.gate, parsed.approver);
  revalidatePath(`/projects/${parsed.projectId}`);
  revalidatePath(`/portal/projects/${parsed.projectId}`);
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

export async function createTaskAction(input: z.infer<typeof CreateTaskInput>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const parsed = CreateTaskInput.parse(input);
  const task = await createTask(parsed);
  revalidatePath(`/projects/${parsed.projectId}`);
  return task;
}