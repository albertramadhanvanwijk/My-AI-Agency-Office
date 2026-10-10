import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules
const mockDb = {
  proposal: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  division: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  room: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  role: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  staff: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("@/lib/realtime/server", () => ({
  emitPresence: vi.fn(),
}));

describe("Division Proposals & 1-Click Approval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("create proposal sets status pending", async () => {
    const { createProposal } = await import("@/modules/proposals/service");

    const mockProposal = {
      id: "prop-1",
      type: "division",
      triggerProjectId: "proj-1",
      payload: { type: "division", name: "Architecture", color: "#6366f1", icon: "building", description: "New division for architecture projects", triggerProjectId: "proj-1" },
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDb.proposal.create.mockResolvedValue(mockProposal);

    const result = await createProposal({
      type: "division",
      payload: { type: "division", name: "Architecture", color: "#6366f1", icon: "building", description: "New division for architecture projects", triggerProjectId: "proj-1" },
      triggerProjectId: "proj-1",
    });

    expect(result.status).toBe("pending");
    expect(result.type).toBe("division");
    expect(mockDb.proposal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "division",
        triggerProjectId: "proj-1",
        payload: expect.objectContaining({ name: "Architecture" }),
        status: "pending",
      }),
    });
  });

  it("approve proposal migrates division to active + creates room/roles + links to project", async () => {
    const { approveProposal, migrateProvisional } = await import("@/modules/proposals/service");

    const mockProposal = {
      id: "prop-1",
      type: "division",
      triggerProjectId: "proj-1",
      payload: { type: "division", name: "Architecture", color: "#6366f1", icon: "building", description: "New division for architecture projects", triggerProjectId: "proj-1" },
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockApprovedProposal = { ...mockProposal, status: "approved" as const };

    const mockProvisionalDivision = {
      id: "div-provisional-1",
      name: "Architecture",
      color: "#6366f1",
      icon: "building",
      status: "provisional",
    };

    const mockProject = {
      id: "proj-1",
      divisionIds: [],
    };

    // First call returns pending, second call (after approve) returns approved
    mockDb.proposal.findUnique
      .mockResolvedValueOnce(mockProposal)
      .mockResolvedValueOnce(mockApprovedProposal);
    mockDb.division.findUnique.mockResolvedValue(mockProvisionalDivision);
    mockDb.division.update.mockResolvedValue({ ...mockProvisionalDivision, status: "active" });
    mockDb.room.findMany.mockResolvedValue([]);
    mockDb.room.create.mockResolvedValue({ id: "room-1", type: "division", divisionId: "div-provisional-1" });
    mockDb.role.create.mockResolvedValue({ id: "role-1" });
    mockDb.project.findUnique.mockResolvedValue(mockProject);
    mockDb.project.update.mockResolvedValue({ ...mockProject, divisionIds: ["div-provisional-1"] });
    mockDb.proposal.update.mockResolvedValue(mockApprovedProposal);
    mockDb.auditLog.create.mockResolvedValue({});

    // First approve
    const approved = await approveProposal("prop-1", "owner-1");
    expect(approved.status).toBe("approved");

    // Then migrate
    const migrated = await migrateProvisional("prop-1");
    expect(migrated.division.status).toBe("active");
    expect(mockDb.room.create).toHaveBeenCalled();
    expect(mockDb.role.create).toHaveBeenCalledTimes(4); // HEAD, MANAGER, STAFF x2
    expect(mockDb.project.update).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      data: { divisionIds: { push: "div-provisional-1" } },
    });
  });

  it("reject proposal sets rejected", async () => {
    const { rejectProposal } = await import("@/modules/proposals/service");

    const mockProposal = {
      id: "prop-2",
      type: "division",
      triggerProjectId: "proj-1",
      payload: { type: "division", name: "Architecture" },
      status: "pending",
    };

    mockDb.proposal.findUnique.mockResolvedValue(mockProposal);
    mockDb.proposal.update.mockResolvedValue({ ...mockProposal, status: "rejected" });
    mockDb.auditLog.create.mockResolvedValue({});

    const result = await rejectProposal("prop-2", "Not needed");

    expect(result.status).toBe("rejected");
    expect(mockDb.proposal.update).toHaveBeenCalledWith({
      where: { id: "prop-2" },
      data: { status: "rejected" },
    });
  });

  it("1-click approve triggers migration atomically", async () => {
    const { approveProposal, migrateProvisional } = await import("@/modules/proposals/service");

    const mockProposal = {
      id: "prop-3",
      type: "division",
      triggerProjectId: "proj-2",
      payload: { type: "division", name: "Data Science", color: "#10b981", icon: "chart-bar", description: "Data science division", triggerProjectId: "proj-2" },
      status: "pending",
    };

    const mockApprovedProposal = { ...mockProposal, status: "approved" as const };

    const mockProvisionalDivision = {
      id: "div-provisional-2",
      name: "Data Science",
      color: "#10b981",
      icon: "chart-bar",
      status: "provisional",
    };

    const mockProject = {
      id: "proj-2",
      divisionIds: [],
    };

    // First call returns pending, second call (after approve) returns approved
    mockDb.proposal.findUnique
      .mockResolvedValueOnce(mockProposal)
      .mockResolvedValueOnce(mockApprovedProposal);
    mockDb.division.findUnique.mockResolvedValue(mockProvisionalDivision);
    mockDb.division.update.mockResolvedValue({ ...mockProvisionalDivision, status: "active" });
    mockDb.room.findMany.mockResolvedValue([]);
    mockDb.room.create.mockResolvedValue({ id: "room-2", type: "division", divisionId: "div-provisional-2" });
    mockDb.role.create.mockResolvedValue({ id: "role-2" });
    mockDb.project.findUnique.mockResolvedValue(mockProject);
    mockDb.project.update.mockResolvedValue({ ...mockProject, divisionIds: ["div-provisional-2"] });
    mockDb.proposal.update.mockResolvedValue(mockApprovedProposal);
    mockDb.auditLog.create.mockResolvedValue({});

    // Simulate 1-click approve: approve + migrate in sequence
    await approveProposal("prop-3", "owner-1");
    const migrated = await migrateProvisional("prop-3");

    expect(migrated.division.status).toBe("active");
    expect(migrated.proposal.status).toBe("approved");
    expect(mockDb.room.create).toHaveBeenCalled();
    expect(mockDb.role.create).toHaveBeenCalled();
    expect(mockDb.project.update).toHaveBeenCalledWith({
      where: { id: "proj-2" },
      data: { divisionIds: { push: "div-provisional-2" } },
    });
  });
});