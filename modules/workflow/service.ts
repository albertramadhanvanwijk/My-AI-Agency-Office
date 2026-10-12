import { db } from "@/lib/db";
import { aiDispatch } from "@/lib/ai/router";
import { emitPresence } from "@/lib/realtime/server";
import { Queue } from "bullmq";

const dispatchQueue = new Queue("dispatch", { connection: { host: "localhost", port: 6379 } });

export async function createProject(input: { clientId: string; title: string; brief: string }) {
  return db.project.create({
    data: {
      clientId: input.clientId,
      title: input.title,
      brief: input.brief,
      status: "INQUIRY",
      briefApprovedByOwner: false,
      briefApprovedByClient: false,
      planApprovedByOwner: false,
      planApprovedByClient: false,
      revisionCount: 0,
      maxRevisions: 2,
      divisionIds: [],
    },
  });
}

export async function approveGate(projectId: string, gate: "brief" | "plan", approver: "owner" | "client") {
  const field = gate === "brief"
    ? (approver === "owner" ? "briefApprovedByOwner" : "briefApprovedByClient")
    : (approver === "owner" ? "planApprovedByOwner" : "planApprovedByClient");

  const project = await db.project.update({
    where: { id: projectId },
    data: { [field]: true },
  });

  if (gate === "brief" && project.briefApprovedByOwner && project.briefApprovedByClient) {
    await db.project.update({ where: { id: projectId }, data: { status: "PLANNING" } });
  }
  if (gate === "plan" && project.planApprovedByOwner && project.planApprovedByClient) {
    await db.project.update({ where: { id: projectId }, data: { status: "EXECUTION" } });
  }

  return db.project.findUnique({ where: { id: projectId } });
}

export async function buildWBS(projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  // In real implementation, PM via 9Router generates tasks
  // For now, return template based on divisions
  const divisions = project.divisionIds.length > 0 ? project.divisionIds : ["strategy", "creative", "tech", "marketing"];

  const tasks = divisions.map((division, i) => ({
    projectId: project.id,
    stage: division.toUpperCase(),
    status: "todo" as const,
    assigneeRoleId: `${division}-lead`,
    payload: { division, description: `Execute ${division} deliverables for ${project.title}` },
  }));

  const created = await db.task.createMany({ data: tasks });
  return { project, tasks: created };
}

export async function dispatchTask(taskId: string, roleId: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  // Enqueue to BullMQ
  await dispatchQueue.add("dispatch", { taskId, roleId });

  // Activate staff via realtime
  await emitPresence("staff:status", { roleId, status: "active" });

  await db.task.update({ where: { id: taskId }, data: { status: "progress" } });

  return { enqueued: true };
}

export async function qaConsolidate(projectId: string) {
  const tasks = await db.task.findMany({ where: { projectId } });
  const allReviewed = tasks.every(t => t.status === "review" || t.status === "done");
  return { passed: allReviewed, reviewedCount: tasks.filter(t => t.status === "review").length };
}

export async function deliver(projectId: string) {
  const project = await db.project.update({
    where: { id: projectId },
    data: { status: "DELIVERY" },
  });
  return { delivered: true, project };
}

export async function requestRevision(projectId: string, reason: string) {
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  if (project.revisionCount >= project.maxRevisions) {
    throw new Error("Max revisions exceeded");
  }

  await db.project.update({
    where: { id: projectId },
    data: {
      status: "EXECUTION",
      revisionCount: { increment: 1 },
    },
  });

  return { status: "EXECUTION", revisionCount: project.revisionCount + 1 };
}

export async function closeProject(projectId: string) {
  return db.project.update({
    where: { id: projectId },
    data: { status: "CLOSING" },
  });
}

export async function checkDivisionCapability(divisionName: string) {
  const division = await db.division.findUnique({ where: { name: divisionName } });

  if (!division) {
    // Create provisional division
    const provisional = await db.division.create({
      data: {
        name: divisionName,
        color: "#6b7280",
        icon: "help-circle",
        status: "provisional",
      },
    });

    // Create proposal for Owner approval
    const proposal = await db.proposal.create({
      data: {
        type: "division",
        payload: { divisionId: provisional.id, reason: "Required by incoming project" },
        status: "pending",
      },
    });

    return { hasCapability: false, proposalCreated: true, provisionalDivision: provisional, proposal };
  }

  return { hasCapability: true, division };
}

export async function createTask(input: { projectId: string; title: string; description: string; assigneeRoleId: string; stage: string }) {
  return db.task.create({
    data: {
      projectId: input.projectId,
      stage: input.stage,
      status: "todo",
      assigneeRoleId: input.assigneeRoleId,
      payload: { title: input.title, description: input.description },
    },
  });
}