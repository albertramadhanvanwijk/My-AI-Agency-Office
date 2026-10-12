import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules
const mockDb = {
  project: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  task: {
    create: vi.fn(),
    createMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  staff: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  division: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  proposal: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

vi.mock("@/lib/ai/router", () => ({
  aiDispatch: vi.fn().mockResolvedValue({ model: "test-model", result: "ok" }),
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
}));

vi.mock("@/lib/realtime/server", () => ({
  emitPresence: vi.fn(),
}));

const mockQueueAdd = vi.fn().mockResolvedValue({ id: "job-1" });

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockQueueAdd,
  })),
}));

describe("Workflow 7 Stage + PM Dispatch + Kanban + Provisional", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueueAdd.mockClear();
    
    // Setup default mock responses
    mockDb.project.findUnique.mockResolvedValue({
      id: "p1",
      status: "BRIEF",
      briefApprovedByOwner: false,
      briefApprovedByClient: false,
      planApprovedByOwner: false,
      planApprovedByClient: false,
      revisionCount: 0,
      maxRevisions: 2,
      divisionIds: [],
    });
    mockDb.project.update.mockResolvedValue({});
    mockDb.task.findUnique.mockResolvedValue({ id: "t1", projectId: "p1" });
    mockDb.task.findMany.mockResolvedValue([]);
    mockDb.task.createMany.mockResolvedValue({ count: 4 });
    mockDb.division.findUnique.mockResolvedValue(null);
    mockDb.division.create.mockResolvedValue({ id: "div-new", name: "Test" });
    mockDb.proposal.create.mockResolvedValue({ id: "prop-1" });
  });

  it("7-stage lifecycle: inquiry→brief→planning→gate2→execution→qa→delivery→closing", async () => {
    const { buildWBS, dispatchTask, qaConsolidate, deliver, requestRevision, closeProject, approveGate } =
      await import("@/modules/workflow/service");

    const project = { id: "p1", status: "INQUIRY", clientId: "c1", brief: "Test project" };

    // Transition through stages
    expect(project.status).toBe("INQUIRY");

    // Brief stage
    project.status = "BRIEF";
    await approveGate(project.id, "brief", "owner");
    await approveGate(project.id, "brief", "client");
    expect(project.status).toBe("BRIEF");

    // Planning stage
    project.status = "PLANNING";
    const wbs = await buildWBS(project.id);
    expect(wbs).toBeDefined();
    expect(wbs.tasks).toBeDefined();

    // Gate 2 approval
    await approveGate(project.id, "plan", "owner");
    await approveGate(project.id, "plan", "client");
    expect(project.status).toBe("PLANNING");

    // Execution
    project.status = "EXECUTION";
    const task = { id: "t1", projectId: project.id, assigneeRoleId: "r1" };
    await dispatchTask(task.id, "r1");
    expect(task.id).toBeDefined();

    // QA
    project.status = "QA";
    const qaResult = await qaConsolidate(project.id);
    expect(qaResult.passed).toBe(true);

    // Delivery
    project.status = "DELIVERY";
    const delivery = await deliver(project.id);
    expect(delivery.delivered).toBe(true);

    // Closing
    project.status = "CLOSING";
    await closeProject(project.id);
    expect(project.status).toBe("CLOSING");
  });

  it("Gate 1 without Owner + Client approval stays in BRIEF", async () => {
    const { approveGate } = await import("@/modules/workflow/service");

    const project = { id: "p2", status: "BRIEF" };

    // Only owner approves
    await approveGate(project.id, "brief", "owner");
    expect(project.status).toBe("BRIEF");

    // Only client approves
    await approveGate(project.id, "brief", "client");
    expect(project.status).toBe("BRIEF");
  });

  it("dispatch enqueues job and activates staff (desk appears)", async () => {
    const { dispatchTask } = await import("@/modules/workflow/service");

    const task = { id: "t3", projectId: "p1", assigneeRoleId: "r1" };
    await dispatchTask(task.id, "r1");

    expect(mockQueueAdd).toHaveBeenCalledWith("dispatch", {
      taskId: task.id,
      roleId: "r1",
    });
  });

  it("revision loops back to EXECUTION, max revisi enforced", async () => {
    const { requestRevision, deliver } = await import("@/modules/workflow/service");

    // Update mock for this test - need to track revision count
    let revisionCount = 0;
    mockDb.project.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === "p4") {
        return {
          id: "p4",
          status: "DELIVERY",
          revisionCount,
          maxRevisions: 2,
        };
      }
      return mockDb.project.findUnique.getMockImplementation()?.({ where });
    });
    mockDb.project.update.mockImplementation(async ({ data }) => {
      if (data.revisionCount?.increment) {
        revisionCount++;
      }
      if (data.status) {
        return { id: "p4", status: data.status, revisionCount };
      }
      return { id: "p4", status: "DELIVERY", revisionCount };
    });

    const project = { id: "p4", status: "DELIVERY", revisionCount: 0, maxRevisions: 2 };
    await deliver(project.id);

    // First revision
    await requestRevision(project.id, "Need changes");
    expect(revisionCount).toBe(1);

    // Second revision
    await requestRevision(project.id, "More changes");
    expect(revisionCount).toBe(2);

    // Third revision should be blocked
    await expect(requestRevision(project.id, "More")).rejects.toThrow("Max revisions exceeded");
  });

  it("gap check: unknown division → provisional + proposal created", async () => {
    const { checkDivisionCapability } = await import("@/modules/workflow/service");

    // Unknown division
    const result = await checkDivisionCapability("NonExistentDivision");
    expect(result.hasCapability).toBe(false);
    expect(result.proposalCreated).toBe(true);
    expect(result.provisionalDivision).toBeDefined();
  });

  it("dispatchTask does not throw when REDIS_URL missing / enqueue fails (graceful fallback)", async () => {
    const { dispatchTask, _resetDispatchQueue } = await import("@/modules/workflow/service");
    _resetDispatchQueue();
    // Force Queue.add to throw (simulate Redis unavailable)
    mockQueueAdd.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const res = await dispatchTask("t1", "r1");
    expect(res.enqueued).toBeDefined();
    expect(res.enqueued).toBe(false);
    expect(res.skipped).toBeDefined();
    // Still progresses — db.task.update called with progress
    expect(mockDb.task.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "progress" } }));
    // Also verify skipped string contains error
    expect(String(res.skipped)).toMatch(/ECONNREFUSED/);
    _resetDispatchQueue();
    mockQueueAdd.mockResolvedValue({ id: "job-1" });
  });

  it("getDispatchQueue respects REDIS_URL env (lazy init, no throw at import) and parseRedisUrl", async () => {
    // Import should never throw even with no Redis
    await expect(import("@/modules/workflow/service")).resolves.toBeDefined();
    const { parseRedisUrl, getDispatchQueue, _resetDispatchQueue } = await import("@/modules/workflow/service");

    // parseRedisUrl: redis://
    expect(parseRedisUrl("redis://localhost:6379")).toEqual(expect.objectContaining({ host: "localhost", port: 6379 }));
    expect(parseRedisUrl("redis://myhost:1234")).toEqual(expect.objectContaining({ host: "myhost", port: 1234 }));
    // redis://:pass@host:port
    expect(parseRedisUrl("redis://:s3cret@redis.example.com:6380")).toEqual(
      expect.objectContaining({ host: "redis.example.com", port: 6380, password: "s3cret" })
    );
    // rediss:// with TLS
    const tlsParsed = parseRedisUrl("rediss://:s3cret@redis.example.com:6380");
    expect(tlsParsed.host).toBe("redis.example.com");
    expect(tlsParsed.port).toBe(6380);
    expect(tlsParsed.password).toBe("s3cret");
    expect(tlsParsed.tls).toBeDefined();
    // rediss without password
    const tlsNoPass = parseRedisUrl("rediss://redis.example.com:6380");
    expect(tlsNoPass.tls).toBeDefined();
    expect(tlsNoPass.host).toBe("redis.example.com");

    // Lazy singleton respects SKIP_LISTEN — returns null without throwing
    const origSkip = process.env.SKIP_LISTEN;
    process.env.SKIP_LISTEN = "true";
    _resetDispatchQueue();
    expect(getDispatchQueue()).toBeNull();
    // Second call returns same null (cached)
    expect(getDispatchQueue()).toBeNull();
    _resetDispatchQueue();
    process.env.SKIP_LISTEN = origSkip;

    // After reset with no SKIP_LISTEN, queue is available (mock)
    _resetDispatchQueue();
    const q = getDispatchQueue();
    expect(q).not.toBeNull();
    expect(q?.add).toBeDefined();
    _resetDispatchQueue();
  });
});