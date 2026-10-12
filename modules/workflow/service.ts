import { db } from "@/lib/db";
import { aiDispatch } from "@/lib/ai/router";
import { emitPresence } from "@/lib/realtime/server";
import { Queue } from "bullmq";

export function parseRedisUrl(url: string): { host: string; port: number; password?: string; tls?: object } {
  const u = new URL(url);
  const host = u.hostname || "localhost";
  const port = u.port ? Number.parseInt(u.port, 10) : 6379;
  const password = u.password ? decodeURIComponent(u.password) : undefined;
  const tls = u.protocol === "rediss:" ? {} : undefined;
  return {
    host,
    port,
    ...(password ? { password } : {}),
    ...(tls ? { tls } : {}),
  };
}

let _queue: Queue | null | undefined = undefined;

export function getDispatchQueue(): Queue | null {
  if (_queue !== undefined) return _queue;
  if (process.env.SKIP_LISTEN === "true") {
    _queue = null;
    return _queue;
  }
  const url = process.env.REDIS_URL;
  try {
    if (url) {
      const conn = parseRedisUrl(url);
      _queue = new Queue("dispatch", { connection: conn as unknown as { host: string; port: number } });
    } else if (process.env.REDIS_HOST) {
      _queue = new Queue("dispatch", {
        connection: {
          host: process.env.REDIS_HOST,
          port: Number.parseInt(process.env.REDIS_PORT || "6379", 10),
        },
      });
    } else {
      _queue = new Queue("dispatch", {
        connection: { host: "localhost", port: 6379 },
        prefix: "myagency",
      });
    }
  } catch {
    _queue = null;
  }
  return _queue;
}

// Test-only helper to reset lazy singleton between tests
export function _resetDispatchQueue(): void {
  _queue = undefined;
}

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

export async function dispatchTask(
  taskId: string,
  roleId: string
): Promise<{ enqueued: boolean; skipped?: string }> {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("Task not found");

  // Enqueue to BullMQ — best-effort, never throws
  let enqueued = false;
  let skipped: string | undefined;
  try {
    const q = getDispatchQueue();
    if (q) {
      await q.add("dispatch", { taskId, roleId });
      enqueued = true;
    } else {
      skipped = "no-queue";
    }
  } catch (e) {
    console.warn("[dispatch] enqueue skipped", e);
    skipped = String(e);
  }

  // Activate staff via realtime (best-effort)
  try {
    await emitPresence("staff:status", { roleId, status: "active" });
  } catch {
    // ignore presence failures
  }

  await db.task.update({ where: { id: taskId }, data: { status: "progress" } });

  if (enqueued) return { enqueued: true };
  return { enqueued: false, skipped: skipped ?? "unknown" };
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