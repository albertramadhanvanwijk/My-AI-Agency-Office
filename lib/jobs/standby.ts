import { db } from "@/lib/db";
import { GRACE_HOURS, emitPresence } from "@/lib/realtime/server";
import { Prisma, ProjectStatus } from "@prisma/client";

/**
 * Auto-standby job configuration
 * Runs periodically to check for inactive projects and move staff to standby
 */
const GRACE_MS = GRACE_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds

// Active project statuses that should keep staff active
const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = [
  "INQUIRY",
  "BRIEF",
  "PLANNING",
  "EXECUTION",
  "QA",
  "DELIVERY",
];

/**
 * Check if a project is considered "active" for grace period purposes
 */
function isProjectActive(project: { status: ProjectStatus }): boolean {
  return ACTIVE_PROJECT_STATUSES.includes(project.status);
}

/**
 * Get the latest activity timestamp for a project
 * Uses the most recent task update or project update
 */
function getLatestProjectActivity(project: {
  updatedAt: Date;
  tasks?: Array<{ updatedAt: Date }>;
}): number {
  let latest = project.updatedAt.getTime();

  if (project.tasks && project.tasks.length > 0) {
    for (const task of project.tasks) {
      if (task.updatedAt.getTime() > latest) {
        latest = task.updatedAt.getTime();
      }
    }
  }

  return latest;
}

/**
 * Run the auto-standby check
 * Finds projects with no activity > GRACE_HOURS and moves assigned staff to standby
 * Idempotent: only affects staff that are currently active
 */
export async function runStandbyJob(): Promise<{
  checked: number;
  movedToStandby: number;
  errors: string[];
}> {
  const now = Date.now();
  const cutoff = now - GRACE_MS;
  const errors: string[] = [];
  let checked = 0;
  let movedToStandby = 0;

  try {
    // Find all active projects with their tasks
    const projects = await db.project.findMany({
      where: {
        status: { in: ACTIVE_PROJECT_STATUSES },
      },
      include: {
        tasks: {
          where: { assigneeStaffId: { not: null } },
          select: { id: true, assigneeStaffId: true, updatedAt: true },
        },
      },
    });

    checked = projects.length;

    for (const project of projects) {
      const latestActivity = getLatestProjectActivity(project as { updatedAt: Date; tasks?: Array<{ updatedAt: Date }> });

      // Skip if project has recent activity
      if (latestActivity > cutoff) {
        continue;
      }

      // Project is inactive beyond grace period
      // Find active staff assigned to this project's tasks
      const assignedStaffIds = project.tasks
        .map((t) => t.assigneeStaffId)
        .filter((id): id is string => id !== null);

      if (assignedStaffIds.length === 0) {
        continue;
      }

      // Get currently active staff among assigned
      const activeStaff = await db.staff.findMany({
        where: {
          id: { in: assignedStaffIds },
          status: "active",
        },
        select: { id: true, deskId: true, name: true, role: { select: { title: true } }, division: { select: { name: true } } },
      });

      for (const staff of activeStaff) {
        try {
          // Move staff to standby
          await db.$transaction(async (tx) => {
            // Clear desk assignment
            if (staff.deskId) {
              await tx.desk.update({
                where: { id: staff.deskId },
                data: { staffId: null },
              });
            }

            // Update staff status
            await tx.staff.update({
              where: { id: staff.id },
              data: { status: "standby", deskId: null, updatedAt: new Date() },
            });

            // Log audit trail
            await tx.auditLog.create({
              data: {
                who: "system:standby-job",
                action: "staff.auto-standby",
                targetId: staff.id,
                modelUsed: null,
                tokens: 0,
              },
            });
          });

          // Emit presence event
          emitPresence("staff:status", {
            staffId: staff.id,
            status: "standby",
            deskId: null,
            name: staff.name,
            role: staff.role?.title,
            division: staff.division?.name,
          });

          movedToStandby++;
        } catch (staffError) {
          const msg = `Failed to move staff ${staff.id} to standby: ${staffError}`;
          console.error("[Standby Job]", msg);
          errors.push(msg);
        }
      }
    }

    console.log(`[Standby Job] Checked ${checked} projects, moved ${movedToStandby} staff to standby`);
    return { checked, movedToStandby, errors };
  } catch (error) {
    const msg = `Standby job failed: ${error}`;
    console.error("[Standby Job]", msg);
    errors.push(msg);
    return { checked, movedToStandby, errors };
  }
}

/**
 * Start the standby job as a recurring interval
 * For MVP, uses setInterval. In production, use BullMQ or Trigger.dev.
 */
let standbyInterval: NodeJS.Timeout | null = null;

export function startStandbyJob(intervalMinutes = 10): void {
  if (standbyInterval) {
    console.log("[Standby Job] Already running");
    return;
  }

  const intervalMs = intervalMinutes * 60 * 1000;
  console.log(`[Standby Job] Starting with ${intervalMinutes} minute interval (grace: ${GRACE_HOURS}h)`);

  // Run immediately on start
  runStandbyJob().catch(console.error);

  // Then run on interval
  standbyInterval = setInterval(() => {
    runStandbyJob().catch(console.error);
  }, intervalMs);
}

/**
 * Stop the standby job interval
 */
export function stopStandbyJob(): void {
  if (standbyInterval) {
    clearInterval(standbyInterval);
    standbyInterval = null;
    console.log("[Standby Job] Stopped");
  }
}

/**
 * Get current grace period in hours
 */
export function getGraceHours(): number {
  return GRACE_HOURS;
}