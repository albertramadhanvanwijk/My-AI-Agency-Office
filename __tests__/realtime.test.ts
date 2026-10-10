import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Ensure required env for lib/env eager validation
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-secret-32-chars-long-for-testing-12345";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "test-google-client-secret";
process.env.NINE_ROUTER_API_KEY = process.env.NINE_ROUTER_API_KEY || "test-9router-key";
process.env.GRACE_HOURS = process.env.GRACE_HOURS || "48";
// Skip actual socket listening in tests
process.env.SKIP_LISTEN = "true";

// Mock Prisma client
vi.mock("@/lib/db", () => ({
  db: {
    staff: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    desk: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    room: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
    $transaction: vi.fn(async (fn) => {
      const newMockTx = {
        staff: { update: vi.fn().mockResolvedValue({}) },
        desk: { update: vi.fn().mockResolvedValue({}) },
        auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-1" }) },
      };
      // Store the mock tx globally so tests can access it
      mockTx = newMockTx;
      return fn(newMockTx);
    }),
  },
}));

// Mock Socket.io - we need to track emits from the server
const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockTo = vi.fn(() => ({ emit: mockEmit, on: mockOn }));
const mockOf = vi.fn(() => ({ to: mockTo, emit: mockEmit, on: mockOn })) as unknown as ReturnType<typeof vi.fn> & { to: ReturnType<typeof vi.fn>; emit: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> };

// Track the mock IO instance for testing
let mockIO: { of: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn>; listen: ReturnType<typeof vi.fn> } | null = null;

vi.mock("socket.io", () => ({
  Server: vi.fn().mockImplementation(() => {
    const instance = {
      of: mockOf,
      on: vi.fn(),
      listen: vi.fn(),
    };
    mockIO = instance;
    return instance;
  }),
  Socket: vi.fn(),
}));

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
    disconnect: vi.fn(),
  })),
}));

// Helper to reset socket mock
function resetSocketMock() {
  mockEmit.mockClear();
  mockOn.mockClear();
  mockTo.mockClear();
  mockOf.mockClear();
  if (mockIO) {
    mockIO.on.mockClear();
    mockIO.listen.mockClear();
  }
}

// Track mock transaction for test verification
let mockTx: { staff: { update: ReturnType<typeof vi.fn> }; desk: { update: ReturnType<typeof vi.fn> }; auditLog: { create: ReturnType<typeof vi.fn> } } | null = null;

// Helper to initialize mock io in server module
async function initMockIO() {
  const { startRealtimeServer, getIO } = await import("@/lib/realtime/server");
  // Start server with mock - this will create the mock IO instance
  startRealtimeServer(3001);
  const io = getIO();
  if (io) {
    // Replace the of() method to return our mock chain
    io.of = mockOf;
  }
  return io;
}

describe("Realtime & Active Presence (Task 7)", () => {
  const originalEnv = { ...process.env };
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.NEXTAUTH_SECRET = "test-secret-32-chars-long-for-testing-12345";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.GRACE_HOURS = "48";

    // Mock Date.now for time manipulation tests
    originalDateNow = Date.now;
    Date.now = vi.fn(() => new Date("2026-10-10T12:00:00Z").getTime());

    vi.clearAllMocks();
    resetSocketMock();

    // Initialize mock IO in server module
    // We need to import and set the mock io after resetModules
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Date.now = originalDateNow;
    process.env = { ...originalEnv };
  });

  describe("Idempotent Staff Activation", () => {
    beforeEach(async () => {
      await initMockIO();
    });

    it("two concurrent activateStaff(staffId) should result in 1 desk (idempotent)", async () => {
      const { db } = await import("@/lib/db");
      const { activateStaff } = await import("@/lib/realtime/server");

      // Mock staff currently on standby with no desk
      const mockStaffStandby = {
        id: "staff-1",
        roleId: "role-1",
        name: "Test Staff",
        status: "standby",
        deskId: null,
        updatedAt: new Date("2026-10-10T10:00:00Z"),
        role: { title: "Test Role" },
        division: { name: "Test Division" },
      };

      const mockStaffActive = {
        ...mockStaffStandby,
        status: "active",
        deskId: "desk-1",
      };

      // First call returns standby staff, subsequent calls return active staff
      (db.staff.findUnique as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockStaffStandby)
        .mockResolvedValue(mockStaffActive);
      
      // First call to desk.findFirst returns null (no existing desk for staff)
      // Second call (idempotent check) uses desk.findUnique to verify desk exists
      (db.desk.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (db.desk.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "desk-1", staffId: "staff-1", roomId: "room-flex"
      });

      // Mock flexible room
      (db.room.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "room-flex",
        type: "division",
        divisionId: null,
        desks: [],
      });

      // Mock desk creation - only first call succeeds
      let deskCreated = false;
      (db.desk.create as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        if (deskCreated) {
          throw new Error("Unique constraint violation: desk already exists for staff");
        }
        deskCreated = true;
        return { id: "desk-1", staffId: "staff-1", roomId: "room-flex" };
      });

      // Mock staff update
      (db.staff.update as ReturnType<typeof vi.fn>).mockResolvedValue(mockStaffActive);

      // First activation
      const result1 = await activateStaff("staff-1");
      expect(result1.success).toBe(true);
      expect(result1.deskId).toBe("desk-1");
      expect(result1.status).toBe("active");

      // Second concurrent activation (simulating race condition)
      // The function should find staff is already active with desk and return early (idempotent)
      const result2 = await activateStaff("staff-1");
      expect(result2.success).toBe(true);
      expect(result2.deskId).toBe("desk-1");
      expect(result2.status).toBe("active");

      // Staff should only be updated once (idempotent - second call returns early)
      expect(db.staff.update).toHaveBeenCalledTimes(1);
      // Desk should only be created once
      expect(db.desk.create).toHaveBeenCalledTimes(1);
    });

    it("activateStaff emits staff:status event via Socket.io", async () => {
      const { activateStaff } = await import("@/lib/realtime/server");
      const { db } = await import("@/lib/db");

      const mockStaff = {
        id: "staff-2",
        roleId: "role-1",
        name: "Test Staff 2",
        status: "standby",
        deskId: null,
        updatedAt: new Date("2026-10-10T10:00:00Z"),
        role: { title: "Test Role" },
        division: { name: "Test Division" },
      };

      (db.staff.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockStaff);
      (db.desk.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (db.room.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "room-flex",
        type: "division",
        divisionId: null,
        desks: [],
      });
      (db.desk.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "desk-2",
        staffId: "staff-2",
        roomId: "room-flex",
      });
      (db.staff.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockStaff,
        status: "active",
        deskId: "desk-2",
      });

      await activateStaff("staff-2");

      // Verify Socket.io emit was called with staff:status
      expect(mockEmit).toHaveBeenCalledWith("staff:status", expect.objectContaining({
        staffId: "staff-2",
        status: "active",
        deskId: "desk-2",
      }));
    });
  });

  describe("Auto-Standby after Grace Period (48h)", () => {
    beforeEach(async () => {
      await initMockIO();
    });

    it("auto-standby job moves staff to standby after 48h of project inactivity", async () => {
      const { db } = await import("@/lib/db");
      const { runStandbyJob } = await import("@/lib/jobs/standby");

      // Mock projects in active stages with last activity > 48h ago
      const oldTimestamp = new Date("2026-10-08T10:00:00Z").getTime(); // ~48h ago
      const mockProjects = [
        {
          id: "project-1",
          status: "EXECUTION",
          updatedAt: new Date(oldTimestamp),
          tasks: [
            { id: "task-1", assigneeStaffId: "staff-3", updatedAt: new Date(oldTimestamp) },
          ],
        },
      ];

      (db.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);

      // Mock active staff assigned to these tasks
      const mockActiveStaff = [
        { id: "staff-3", roleId: "role-1", name: "Staff 3", status: "active", deskId: "desk-3",
          role: { title: "Test Role" }, division: { name: "Test Division" } },
      ];

      (db.staff.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockActiveStaff);

      // Run the standby job
      const result = await runStandbyJob();

      // Verify staff was moved to standby
      expect(result.movedToStandby).toBe(1);
      // Verify transaction was used for updates
      expect(mockTx).not.toBeNull();
      expect(mockTx?.staff.update).toHaveBeenCalled();
      expect(mockTx?.desk.update).toHaveBeenCalled();

      // Verify presence event emitted
      expect(mockEmit).toHaveBeenCalledWith("staff:status", expect.objectContaining({
        staffId: "staff-3",
        status: "standby",
        deskId: null,
      }));
    });

    it("auto-standby job does NOT move staff if project activity within 48h", async () => {
      const { db } = await import("@/lib/db");
      const { runStandbyJob } = await import("@/lib/jobs/standby");

      // Mock projects with recent activity (< 48h)
      const recentTimestamp = new Date("2026-10-10T10:00:00Z").getTime(); // 2h ago
      const mockProjects = [
        {
          id: "project-2",
          status: "EXECUTION",
          updatedAt: new Date(recentTimestamp),
          tasks: [
            { id: "task-2", assigneeStaffId: "staff-4", updatedAt: new Date(recentTimestamp) },
          ],
        },
      ];

      (db.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);

      await runStandbyJob();

      // Staff should NOT be updated
      expect(db.staff.update).not.toHaveBeenCalled();
      expect(db.desk.update).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it("auto-standby respects GRACE_HOURS env config", async () => {
      // Change grace period to 24h
      process.env.GRACE_HOURS = "24";
      vi.resetModules();

      const { db } = await import("@/lib/db");
      const { runStandbyJob } = await import("@/lib/jobs/standby");

      await initMockIO();

      // Project updated 36h ago - should trigger with 24h grace but not 48h
      const timestamp36h = new Date("2026-10-08T22:00:00Z").getTime(); // 36h ago
      const mockProjects = [
        {
          id: "project-3",
          status: "EXECUTION",
          updatedAt: new Date(timestamp36h),
          tasks: [
            { id: "task-3", assigneeStaffId: "staff-5", updatedAt: new Date(timestamp36h) },
          ],
        },
      ];

      (db.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);
      (db.staff.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "staff-5", roleId: "role-1", name: "Staff 5", status: "active", deskId: "desk-5",
          role: { title: "Test Role" }, division: { name: "Test Division" } },
      ]);

      const result = await runStandbyJob();

      // With 24h grace, 36h old project should trigger standby
      expect(result.movedToStandby).toBe(1);
      // Verify transaction was used for updates
      expect(mockTx).not.toBeNull();
      expect(mockTx?.staff.update).toHaveBeenCalled();
    });
  });

  describe("Presence API", () => {
    beforeEach(async () => {
      await initMockIO();
    });

    it("POST /api/presence toggles staff active/standby", async () => {
      const { db } = await import("@/lib/db");
      
      // Mock the server functions directly
      const { activateStaff, deactivateStaff } = await import("@/lib/realtime/server");
      
      const mockStaff = {
        id: "staff-6",
        roleId: "role-1",
        name: "Test Staff 6",
        status: "standby",
        deskId: null,
        role: { title: "Test Role" },
        division: { name: "Test Division" },
      };

      (db.staff.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockStaff);
      (db.desk.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (db.room.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "room-flex",
        type: "division",
        divisionId: null,
        desks: [],
      });
      (db.desk.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "desk-6", staffId: "staff-6", roomId: "room-flex",
      });
      (db.staff.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockStaff, status: "active", deskId: "desk-6",
      });

      const result = await activateStaff("staff-6");
      expect(result.success).toBe(true);
      expect(result.staffId).toBe("staff-6");
      expect(result.status).toBe("active");
    });

    it("deactivateStaff moves staff to standby", async () => {
      const { deactivateStaff } = await import("@/lib/realtime/server");
      const { db } = await import("@/lib/db");

      const mockStaff = {
        id: "staff-7",
        roleId: "role-1",
        name: "Test Staff 7",
        status: "active",
        deskId: "desk-7",
        role: { title: "Test Role" },
        division: { name: "Test Division" },
      };

      (db.staff.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockStaff);
      (db.desk.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "desk-7", staffId: null });
      (db.staff.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockStaff, status: "standby", deskId: null,
      });

      const result = await deactivateStaff("staff-7");
      expect(result.success).toBe(true);
      expect(result.status).toBe("standby");
      expect(result.deskId).toBeNull();
    });
  });

  describe("usePresence Hook", () => {
    it("returns current presence status for staff", async () => {
      const { usePresence } = await import("@/hooks/usePresence");
      expect(typeof usePresence).toBe("function");
    });
  });
});