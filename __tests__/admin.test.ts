import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma client
const mockDb = {
  setting: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
  },
  featureFlag: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    create: vi.fn(),
  },
  auditLog: {
    findMany: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: "user-1", email: "owner@test.com", role: "OWNER" },
  }),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

describe("Admin Module — Settings, Feature Flags, Audit Logs (Task 12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Settings CRUD", () => {
    it("getSettings returns all settings grouped by category", async () => {
      const { getSettings } = await import("@/modules/admin/service");
      
      mockDb.setting.findMany.mockResolvedValue([
        { id: "s1", key: "appName", value: "My AI Agency Office", description: "Application name", category: "General" },
        { id: "s2", key: "timezone", value: "Asia/Jakarta", description: "Default timezone", category: "General" },
        { id: "s3", key: "defaultModel", value: "gpt-4o", description: "Default AI model", category: "AI" },
        { id: "s4", key: "rateLimit", value: 30, description: "Requests per minute", category: "AI" },
        { id: "s5", key: "smtpHost", value: "smtp.example.com", description: "SMTP host", category: "Email" },
        { id: "s6", key: "fromEmail", value: "noreply@example.com", description: "From email address", category: "Email" },
        { id: "s7", key: "s3Bucket", value: "my-bucket", description: "S3 bucket name", category: "Storage" },
        { id: "s8", key: "cdnUrl", value: "https://cdn.example.com", description: "CDN URL", category: "Storage" },
      ]);

      const settings = await getSettings();
      
      expect(settings).toBeDefined();
      expect(settings.General).toBeDefined();
      expect(settings.AI).toBeDefined();
      expect(settings.Email).toBeDefined();
      expect(settings.Storage).toBeDefined();
      expect(settings.General.length).toBe(2);
      expect(settings.AI.length).toBe(2);
      expect(settings.Email.length).toBe(2);
      expect(settings.Storage.length).toBe(2);
      expect(settings.General[0].key).toBe("appName");
      expect(settings.AI[0].key).toBe("defaultModel");
    });

    it("updateSettings creates or updates a setting and returns it", async () => {
      const { updateSettings } = await import("@/modules/admin/service");
      
      mockDb.setting.upsert.mockResolvedValue({
        id: "s1",
        key: "appName",
        value: "Updated Agency Name",
        description: "Application name",
        category: "General",
      });

      const result = await updateSettings("appName", "Updated Agency Name");
      
      expect(result.key).toBe("appName");
      expect(result.value).toBe("Updated Agency Name");
      expect(mockDb.setting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "appName" },
          create: expect.objectContaining({ key: "appName", value: "Updated Agency Name" }),
          update: expect.objectContaining({ value: "Updated Agency Name" }),
        })
      );
    });

    it("getSetting returns single setting by key", async () => {
      const { getSetting } = await import("@/modules/admin/service");
      
      mockDb.setting.findUnique.mockResolvedValue({
        id: "s1",
        key: "appName",
        value: "My AI Agency Office",
        description: "Application name",
        category: "General",
      });

      const setting = await getSetting("appName");
      
      expect(setting).toBeDefined();
      expect(setting?.key).toBe("appName");
      expect(setting?.value).toBe("My AI Agency Office");
    });
  });

  describe("Feature Flag toggle", () => {
    it("getFeatureFlags returns all feature flags", async () => {
      const { getFeatureFlags } = await import("@/modules/admin/service");
      
      mockDb.featureFlag.findMany.mockResolvedValue([
        { id: "f1", key: "NEW_DIVISION_ENABLED", enabled: true, description: "Allow creating new divisions" },
        { id: "f2", key: "AI_DISPATCH_ENABLED", enabled: true, description: "Enable AI task dispatch" },
        { id: "f3", key: "CHAT_WS_ENABLED", enabled: false, description: "Enable WebSocket chat" },
        { id: "f4", key: "INVOICE_PDF_ENABLED", enabled: true, description: "Enable PDF invoice generation" },
      ]);

      const flags = await getFeatureFlags();
      
      expect(flags).toBeDefined();
      expect(flags.length).toBe(4);
      expect(flags[0].key).toBe("NEW_DIVISION_ENABLED");
      expect(flags[0].enabled).toBe(true);
      expect(flags[2].key).toBe("CHAT_WS_ENABLED");
      expect(flags[2].enabled).toBe(false);
    });

    it("toggleFeatureFlag flips the enabled state", async () => {
      const { toggleFeatureFlag } = await import("@/modules/admin/service");
      
      // First call returns current state (enabled: true)
      mockDb.featureFlag.findUnique.mockResolvedValueOnce({
        id: "f1",
        key: "NEW_DIVISION_ENABLED",
        enabled: true,
        description: "Allow creating new divisions",
      });
      // upsert returns new state (enabled: false)
      mockDb.featureFlag.upsert.mockResolvedValue({
        id: "f1",
        key: "NEW_DIVISION_ENABLED",
        enabled: false,
        description: "Allow creating new divisions",
      });

      const result = await toggleFeatureFlag("NEW_DIVISION_ENABLED");
      
      expect(result.enabled).toBe(false);
      expect(mockDb.featureFlag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "NEW_DIVISION_ENABLED" },
          update: expect.objectContaining({ enabled: false }),
        })
      );
    });

    it("toggleFeatureFlag creates flag if not exists (defaults to true)", async () => {
      const { toggleFeatureFlag } = await import("@/modules/admin/service");
      
      mockDb.featureFlag.findUnique.mockResolvedValueOnce(null);
      mockDb.featureFlag.upsert.mockResolvedValue({
        id: "f5",
        key: "CHAT_WS_ENABLED",
        enabled: true,
        description: "Enable WebSocket chat",
      });

      const result = await toggleFeatureFlag("CHAT_WS_ENABLED");
      
      expect(result.enabled).toBe(true);
      expect(mockDb.featureFlag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "CHAT_WS_ENABLED" },
          create: expect.objectContaining({ key: "CHAT_WS_ENABLED", enabled: true }),
        })
      );
    });
  });

  describe("Audit Log query filters", () => {
    it("getAuditLogs returns paginated results with filters", async () => {
      const { getAuditLogs } = await import("@/modules/admin/service");
      
      const mockLogs = [
        { id: "a1", who: "user-1", action: "project_created", targetId: "proj-1", modelUsed: "gpt-4o", tokens: 1500, createdAt: new Date("2026-10-10T10:00:00Z") },
        { id: "a2", who: "ai-staff-1", action: "task_completed", targetId: "task-1", modelUsed: "claude-3.5", tokens: 2200, createdAt: new Date("2026-10-10T11:00:00Z") },
        { id: "a3", who: "user-1", action: "invoice_sent", targetId: "inv-1", modelUsed: null, tokens: null, createdAt: new Date("2026-10-10T12:00:00Z") },
      ];
      
      mockDb.auditLog.findMany.mockResolvedValue(mockLogs);
      mockDb.auditLog.count.mockResolvedValue(3);

      const result = await getAuditLogs({ who: "user-1", limit: 10, offset: 0 });
      
      expect(result.logs).toHaveLength(3);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            who: { contains: "user-1", mode: "insensitive" },
          }),
          take: 10,
          skip: 0,
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("getAuditLogs filters by action", async () => {
      const { getAuditLogs } = await import("@/modules/admin/service");
      
      mockDb.auditLog.findMany.mockResolvedValue([
        { id: "a1", who: "user-1", action: "project_created", targetId: "proj-1", modelUsed: "gpt-4o", tokens: 1500, createdAt: new Date("2026-10-10T10:00:00Z") },
      ]);
      mockDb.auditLog.count.mockResolvedValue(1);

      await getAuditLogs({ action: "project_created", limit: 10, offset: 0 });
      
      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: { contains: "project_created", mode: "insensitive" } }),
        })
      );
    });

    it("getAuditLogs filters by date range (from, to)", async () => {
      const { getAuditLogs } = await import("@/modules/admin/service");
      
      mockDb.auditLog.findMany.mockResolvedValue([]);
      mockDb.auditLog.count.mockResolvedValue(0);

      await getAuditLogs({ 
        from: new Date("2026-10-01"), 
        to: new Date("2026-10-31"), 
        limit: 10, 
        offset: 0 
      });
      
      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: new Date("2026-10-01"),
              lte: new Date("2026-10-31"),
            }),
          }),
        })
      );
    });

    it("getAuditLogs filters by targetId", async () => {
      const { getAuditLogs } = await import("@/modules/admin/service");
      
      mockDb.auditLog.findMany.mockResolvedValue([]);
      mockDb.auditLog.count.mockResolvedValue(0);

      await getAuditLogs({ targetId: "proj-1", limit: 10, offset: 0 });
      
      expect(mockDb.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ targetId: "proj-1" }),
        })
      );
    });
  });

  describe("CSV Export", () => {
    it("exportAuditLogsCSV returns CSV string with headers and data", async () => {
      const { exportAuditLogsCSV } = await import("@/modules/admin/service");
      
      const mockLogs = [
        { id: "a1", who: "user-1", action: "project_created", targetId: "proj-1", modelUsed: "gpt-4o", tokens: 1500, createdAt: new Date("2026-10-10T10:00:00Z"), projectId: "proj-1" },
        { id: "a2", who: "ai-staff-1", action: "task_completed", targetId: "task-1", modelUsed: "claude-3.5", tokens: 2200, createdAt: new Date("2026-10-10T11:00:00Z"), projectId: "proj-1" },
      ];
      
      mockDb.auditLog.findMany.mockResolvedValue(mockLogs);

      const csv = await exportAuditLogsCSV({ limit: 1000, offset: 0 });
      
      expect(csv).toContain("id,who,action,targetId,modelUsed,tokens,createdAt,projectId");
      expect(csv).toContain("a1,user-1,project_created,proj-1,gpt-4o,1500");
      expect(csv).toContain("a2,ai-staff-1,task_completed,task-1,claude-3.5,2200");
      // Should not have trailing commas
      const lines = csv.trim().split("\n");
      expect(lines.length).toBe(3); // header + 2 data rows
    });

    it("exportAuditLogsCSV handles empty results", async () => {
      const { exportAuditLogsCSV } = await import("@/modules/admin/service");
      
      mockDb.auditLog.findMany.mockResolvedValue([]);

      const csv = await exportAuditLogsCSV({ limit: 1000, offset: 0 });
      
      expect(csv).toBe("id,who,action,targetId,modelUsed,tokens,createdAt,projectId\n");
    });
  });
});