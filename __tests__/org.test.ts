import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Prisma mock ----
const mockDb = {
  role: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  division: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  room: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  staff: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
  desk: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  project: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  proposal: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
  $transaction: vi.fn(async (fn: any) => fn(mockDb)),
};

vi.mock("@/lib/db", () => ({ db: mockDb }));

const mockEmit = vi.fn();
vi.mock("@/lib/realtime/server", () => ({
  emitPresence: mockEmit,
  activateStaff: vi.fn(async (staffId: string) => {
    const staff = await mockDb.staff.findUnique({ where: { id: staffId } });
    if (!staff) return { success: false, staffId, status: "standby", deskId: null, error: "Staff not found" };
    // idempotent: if active with desk return early
    if (staff.status === "active" && staff.deskId) {
      return { success: true, staffId, status: "active", deskId: staff.deskId };
    }
    // create/find desk
    const existingByStaff = await mockDb.desk.findFirst({ where: { staffId } });
    let desk = existingByStaff;
    if (!desk) {
      desk = await mockDb.desk.create({ data: { staffId, roomId: "room-flex", clusterId: "flex-cluster" } });
    }
    await mockDb.staff.update({ where: { id: staffId }, data: { status: "active", deskId: desk.id } });
    mockEmit("staff:status", { staffId, status: "active", deskId: desk.id });
    return { success: true, staffId, status: "active", deskId: desk.id };
  }),
  deactivateStaff: vi.fn(async (staffId: string) => {
    const staff = await mockDb.staff.findUnique({ where: { id: staffId } });
    if (!staff) return { success: false, staffId, status: "standby", deskId: null, error: "Staff not found" };
    if (staff.deskId) {
      await mockDb.desk.update({ where: { id: staff.deskId }, data: { staffId: null } });
    }
    await mockDb.staff.update({ where: { id: staffId }, data: { status: "standby", deskId: null } });
    mockEmit("staff:status", { staffId, status: "standby", deskId: null });
    return { success: true, staffId, status: "standby", deskId: null };
  }),
  getIO: vi.fn(() => ({ of: vi.fn(() => ({ to: vi.fn(() => ({ emit: mockEmit })), emit: mockEmit })) })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next-auth", () => ({ getServerSession: vi.fn().mockResolvedValue({ user: { id: "owner-1", role: "OWNER" } }) }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));

describe("Organization — Roles, Proposals, HR Toggle (Task 12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmit.mockClear();
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  it("add role via form creates roles row (Tier1 no deploy)", async () => {
    const { addRole } = await import("@/modules/org/service");

    const createdRole = {
      id: "role-new-1",
      divisionId: "div-1",
      title: "QA Engineer",
      level: "STAFF",
      systemPrompt: "You are QA",
      modelVia9Router: "gpt-4o-mini",
      tools: ["execute"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDb.division.findUnique.mockResolvedValue({ id: "div-1", name: "Strategy" } as any);
    mockDb.role.create.mockResolvedValue(createdRole);
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-2" });

    const result = await addRole({
      divisionId: "div-1",
      title: "QA Engineer",
      level: "STAFF",
      systemPrompt: "You are QA",
      modelVia9Router: "gpt-4o-mini",
      tools: ["execute"],
    });

    expect(result.id).toBe("role-new-1");
    expect(result.title).toBe("QA Engineer");
    expect(mockDb.role.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ divisionId: "div-1", title: "QA Engineer", level: "STAFF" }),
      })
    );
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: expect.stringContaining("role") }) })
    );
    expect(mockEmit).toHaveBeenCalled();
  });

  it("provisional proposal approve creates division+room (1-click)", async () => {
    const { approveProvisionalProposal } = await import("@/modules/org/service");

    const mockProposal = {
      id: "prop-1",
      type: "division",
      status: "pending",
      triggerProjectId: "proj-1",
      payload: {
        name: "Architecture",
        color: "#6366f1",
        icon: "building",
        description: "New division",
        triggerProjectId: "proj-1",
        divisionId: "div-provisional-1",
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockDivision = {
      id: "div-provisional-1",
      name: "Architecture",
      color: "#6366f1",
      icon: "building",
      status: "provisional" as const,
    };

    mockDb.proposal.findUnique.mockResolvedValue(mockProposal);
    mockDb.proposal.update.mockResolvedValue({ ...mockProposal, status: "approved" });
    mockDb.division.findUnique.mockResolvedValue(mockDivision);
    mockDb.division.update.mockResolvedValue({ ...mockDivision, status: "active" });
    mockDb.room.findMany.mockResolvedValue([]);
    mockDb.room.create.mockResolvedValue({ id: "room-1", type: "division", divisionId: "div-provisional-1", x: 2, y: 10, w: 12, h: 16, capacity: 8, floor: 1 });
    mockDb.role.create.mockResolvedValue({ id: "role-1", divisionId: "div-provisional-1", level: "HEAD", title: "Head of Architecture" });
    mockDb.project.findUnique.mockResolvedValue({ id: "proj-1", divisionIds: [] });
    mockDb.project.update.mockResolvedValue({ id: "proj-1", divisionIds: ["div-provisional-1"] });
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-3" });

    const result = await approveProvisionalProposal("prop-1", "owner-1");

    expect(result.proposal.status).toBe("approved");
    expect(result.division.status).toBe("active");
    expect(mockDb.division.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "div-provisional-1" }, data: { status: "active" } }));
    expect(mockDb.room.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "division", divisionId: "div-provisional-1" }) })
    );
    expect(mockDb.role.create).toHaveBeenCalled();
    expect(mockDb.project.update).toHaveBeenCalled();
  });

  it("toggle active creates desk (spawn), standby removes", async () => {
    const { toggleStaffStatus } = await import("@/modules/org/service");

    // ---- Active: standby -> active creates desk ----
    const standbyStaff = { id: "staff-1", name: "Alice", status: "standby", deskId: null, roleId: "role-1", divisionId: "div-1" };
    mockDb.staff.findUnique.mockResolvedValueOnce(standbyStaff);
    mockDb.desk.findFirst.mockResolvedValueOnce(null);
    mockDb.desk.create.mockResolvedValueOnce({ id: "desk-1", staffId: "staff-1", roomId: "room-flex", clusterId: "flex-cluster" });
    mockDb.staff.update.mockResolvedValueOnce({ ...standbyStaff, status: "active", deskId: "desk-1" });

    const activeResult = await toggleStaffStatus({ staffId: "staff-1", status: "active" });

    expect(activeResult.success).toBe(true);
    expect(activeResult.status).toBe("active");
    expect(activeResult.deskId).toBe("desk-1");
    expect(mockDb.desk.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ staffId: "staff-1" }) }));
    expect(mockDb.staff.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "staff-1" }, data: expect.objectContaining({ status: "active" }) }));
    expect(mockEmit).toHaveBeenCalledWith("staff:status", expect.objectContaining({ staffId: "staff-1", status: "active" }));

    mockEmit.mockClear();
    vi.clearAllMocks();
    // re-mock audit for second call
    mockDb.auditLog.create.mockResolvedValue({ id: "audit-4" });

    // ---- Standby: active -> standby removes desk ----
    const activeStaff = { id: "staff-1", name: "Alice", status: "active", deskId: "desk-1", roleId: "role-1", divisionId: "div-1" };
    mockDb.staff.findUnique.mockResolvedValueOnce(activeStaff);
    mockDb.desk.update.mockResolvedValueOnce({ id: "desk-1", staffId: null });
    mockDb.staff.update.mockResolvedValueOnce({ ...activeStaff, status: "standby", deskId: null });

    const standbyResult = await toggleStaffStatus({ staffId: "staff-1", status: "standby" });

    expect(standbyResult.success).toBe(true);
    expect(standbyResult.status).toBe("standby");
    expect(standbyResult.deskId).toBeNull();
    expect(mockDb.desk.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "desk-1" }, data: { staffId: null } }));
    expect(mockDb.staff.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "standby", deskId: null }) }));
    expect(mockEmit).toHaveBeenCalledWith("staff:status", expect.objectContaining({ staffId: "staff-1", status: "standby" }));
  });
});
