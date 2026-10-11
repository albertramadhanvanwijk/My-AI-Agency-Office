import { z } from "zod";
import { db } from "@/lib/db";
import { emitPresence } from "@/lib/realtime/server";
import { AddRoleInput, AddDivisionInput, ToggleStaffStatusInput } from "./schema";
import type { AddRoleInputType, AddDivisionInputType, ToggleStaffStatusInputType } from "./schema";

// ── Roles ──────────────────────────────────────────────────────────

export async function addRole(input: AddRoleInputType) {
  const parsed = AddRoleInput.parse(input);

  const division = await db.division.findUnique({ where: { id: parsed.divisionId } });
  if (!division) throw new Error("Division not found");

  const role = await db.role.create({
    data: {
      divisionId: parsed.divisionId,
      title: parsed.title,
      level: parsed.level,
      systemPrompt: parsed.systemPrompt ?? null,
      modelVia9Router: parsed.modelVia9Router ?? process.env.DEFAULT_MODEL_VIA_9ROUTER ?? "gpt-4o-mini",
      tools: parsed.tools ?? [],
    },
  });

  await db.auditLog.create({
    data: { who: "system", action: "role_created", targetId: role.id },
  });

  emitPresence("role:created", { roleId: role.id, divisionId: parsed.divisionId });
  return role;
}

export async function listRoles() {
  return db.role.findMany({
    orderBy: { createdAt: "desc" },
    include: { division: { select: { id: true, name: true, color: true } } },
  });
}

export async function listDivisions(status?: string) {
  return db.division.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { roles: true, staff: true } } },
  });
}

// ── Divisions ──────────────────────────────────────────────────────

export async function addDivision(input: AddDivisionInputType) {
  const parsed = AddDivisionInput.parse(input);

  const existing = await db.division.findUnique({ where: { name: parsed.name } });
  if (existing) throw new Error("Division name already exists");

  const division = await db.division.create({
    data: {
      name: parsed.name,
      color: parsed.color,
      icon: parsed.icon,
      status: parsed.status ?? "provisional",
    },
  });

  // If triggerProjectId provided, create provisional proposal linking it
  if (parsed.triggerProjectId) {
    await db.proposal.create({
      data: {
        type: "division",
        triggerProjectId: parsed.triggerProjectId,
        payload: {
          name: parsed.name,
          color: parsed.color,
          icon: parsed.icon,
          divisionId: division.id,
          triggerProjectId: parsed.triggerProjectId,
          description: parsed.description ?? "",
        } as any,
        status: "pending",
      },
    });
  }

  await db.auditLog.create({
    data: { who: "system", action: "division_created", targetId: division.id },
  });

  emitPresence("division:created", { divisionId: division.id, name: division.name });
  return division;
}

// ── 1-click provisional approve: proposal pending -> division active + room + roles + project link ──

export async function approveProvisionalProposal(proposalId: string, approverId: string) {
  const proposal = await db.proposal.findUnique({ where: { id: proposalId } });
  if (!proposal) throw new Error("Proposal not found");
  if (proposal.status !== "pending") throw new Error("Proposal already processed");
  if (proposal.type !== "division") throw new Error("Only division proposals can be approved via this flow");

  const payload = proposal.payload as { divisionId?: string; name: string; color: string; icon: string; triggerProjectId?: string; description?: string };

  // 1. mark approved
  const updatedProposal = await db.proposal.update({
    where: { id: proposalId },
    data: { status: "approved" },
  });

  await db.auditLog.create({
    data: { who: approverId, action: "approve_proposal", targetId: proposalId },
  });

  // 2. resolve division (by id in payload or by name) — must be provisional if exists
  let division: any = null;
  if (payload.divisionId) {
    division = await db.division.findUnique({ where: { id: payload.divisionId } });
  }
  if (!division) {
    // try by name
    division = await db.division.findUnique({ where: { name: payload.name } } as any);
  }
  // If no provisional division exists, create it now (1-click path without prior addDivision)
  if (!division) {
    division = await db.division.create({
      data: { name: payload.name, color: payload.color, icon: payload.icon, status: "provisional" },
    });
  }
  if (division.status !== "provisional" && division.status !== "active") {
    throw new Error("Division not provisional");
  }

  if (division.status === "provisional") {
    division = await db.division.update({ where: { id: division.id }, data: { status: "active" } });
  }

  // 3. create room if none exists for this division
  const existingRooms = await db.room.findMany({ where: { divisionId: division.id } });
  let room: any = existingRooms[0] ?? null;
  if (!room) {
    const allDivisionRooms = await db.room.findMany({ where: { type: "division" }, select: { x: true, w: true } });
    const maxX = allDivisionRooms.reduce((m: number, r: any) => Math.max(m, (r.x ?? 0) + (r.w ?? 0)), 0);
    room = await db.room.create({
      data: {
        type: "division",
        divisionId: division.id,
        x: maxX + 2,
        y: 10,
        w: 12,
        h: 16,
        capacity: 8,
        floor: 1,
      },
    });
  }

  // 4. create default roles if none exist for division (HEAD/MANAGER/STAFFx2)
  const existingRoles = (await db.role.findMany({ where: { divisionId: division.id } })) as any[] | null;
  const safeExisting: any[] = Array.isArray(existingRoles) ? existingRoles : [];
  const roles: any[] = [...safeExisting];
  if (safeExisting.length === 0) {
    const modelVia9Router = process.env.DEFAULT_MODEL_VIA_9ROUTER || "gpt-4o-mini";
    const defs = [
      { level: "HEAD", title: `Head of ${division.name}`, systemPrompt: `You are the Head of ${division.name}.`, tools: ["delegate", "review", "approve"] },
      { level: "MANAGER", title: `${division.name} Manager`, systemPrompt: `You are the Manager of ${division.name}.`, tools: ["delegate", "track", "report"] },
      { level: "STAFF", title: `${division.name} Specialist I`, systemPrompt: `You are a Specialist in ${division.name}.`, tools: ["execute"] },
      { level: "STAFF", title: `${division.name} Specialist II`, systemPrompt: `You are a Specialist in ${division.name}.`, tools: ["execute"] },
    ];
    for (const d of defs) {
      const r = await db.role.create({ data: { divisionId: division.id, level: d.level, title: d.title, systemPrompt: d.systemPrompt, modelVia9Router, tools: d.tools } });
      roles.push(r);
    }
  }

  // 5. link to trigger project if present
  let project: any = null;
  const triggerProjectId = payload.triggerProjectId ?? (proposal as any).triggerProjectId ?? null;
  if (triggerProjectId) {
    try {
      const proj = await db.project.findUnique({ where: { id: triggerProjectId } });
      if (proj) {
        // push divisionId into divisionIds array (Prisma push)
        project = await db.project.update({
          where: { id: triggerProjectId },
          data: { divisionIds: { push: division.id } } as any,
        });
      }
    } catch {
      // best-effort
    }
  }

  emitPresence("division:provisioned", { divisionId: division.id, proposalId, projectId: triggerProjectId });

  return { proposal: updatedProposal, division, room, roles, project };
}

// ── HR toggle: active creates desk, standby removes ───────────────

export async function toggleStaffStatus(input: ToggleStaffStatusInputType) {
  const parsed = ToggleStaffStatusInput.parse(input);

  const staff = await db.staff.findUnique({ where: { id: parsed.staffId } });
  if (!staff) throw new Error("Staff not found");

  if (parsed.status === "active") {
    // idempotent: if already active with desk, return
    if ((staff as any).status === "active" && (staff as any).deskId) {
      const existing = await db.desk.findUnique({ where: { id: (staff as any).deskId } });
      if (existing) {
        return { success: true as const, staffId: staff.id, status: "active" as const, deskId: (staff as any).deskId as string };
      }
    }
    // find or create desk
    let desk = await db.desk.findFirst({ where: { staffId: staff.id } });
    if (!desk) {
      desk = await db.desk.create({
        data: { staffId: staff.id, roomId: null, clusterId: "flex-cluster" },
      });
    }
    const updated = await db.staff.update({
      where: { id: staff.id },
      data: { status: "active", deskId: desk.id } as any,
    });
    await db.auditLog.create({ data: { who: "system", action: "staff.active", targetId: staff.id } });
    emitPresence("staff:status", { staffId: staff.id, status: "active", deskId: desk.id });
    return { success: true as const, staffId: staff.id, status: "active" as const, deskId: desk.id };
  }

  if (parsed.status === "standby" || parsed.status === "break") {
    const deskId = (staff as any).deskId as string | null;
    if (deskId) {
      try {
        await db.desk.update({ where: { id: deskId }, data: { staffId: null } });
      } catch {
        // ignore if desk not found
      }
    }
    await db.staff.update({
      where: { id: staff.id },
      data: { status: parsed.status, deskId: null } as any,
    });
    await db.auditLog.create({ data: { who: "system", action: `staff.${parsed.status}`, targetId: staff.id } });
    emitPresence("staff:status", { staffId: staff.id, status: parsed.status, deskId: null });
    return { success: true as const, staffId: staff.id, status: parsed.status as "standby" | "break", deskId: null };
  }

  throw new Error("Invalid status");
}

export async function listStaffWithPresence() {
  return db.staff.findMany({
    orderBy: { name: "asc" },
    include: {
      role: { select: { id: true, title: true, level: true } },
      division: { select: { id: true, name: true, color: true } },
    },
  });
}

export async function listProposalsForOrg(status?: string) {
  return db.proposal.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: "desc" },
    include: { triggerProject: { select: { id: true, title: true } } },
  });
}
