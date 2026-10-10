import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Ensure required env for lib/env eager validation
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-secret-32-chars-long-for-testing-12345";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "test-google-client-secret";

// Mocks — hoisted by vitest
vi.mock("@/lib/db", () => ({
  db: {
    role: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    staff: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next-auth", async () => {
  const actual = await vi.importActual<typeof import("next-auth")>("next-auth");
  return {
    ...actual,
    getServerSession: vi.fn(),
  };
});

// Helper to create a mock Request for route handlers
function makeJsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("AI Orchestrator — 9Router Gateway (Task 6)", () => {
  const originalEnv = { ...process.env };
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    // Default: set key so most tests have it; individual test will delete to assert throw
    process.env.NINE_ROUTER_API_KEY = "test-9router-key";
    process.env.NINE_ROUTER_BASE_URL = "https://api.9router.com/v1";
    process.env.NEXTAUTH_SECRET = "test-secret-32-chars-long-for-testing-12345";
    process.env.NEXTAUTH_URL = "http://localhost:3000";

    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: "chatcmpl-test",
        choices: [{ message: { content: "Hello from 9Router", role: "assistant" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        model: "openai/gpt-4o",
      }),
      text: async () => JSON.stringify({ choices: [{ message: { content: "Hello from 9Router" } }] }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Ensure key restored for next test's beforeEach
    process.env.NEXTAUTH_SECRET = originalEnv.NEXTAUTH_SECRET || "test-secret-32-chars-long-for-testing-12345";
  });

  it("router throws if NINE_ROUTER_API_KEY missing", async () => {
    // Remove key to trigger throw
    delete process.env.NINE_ROUTER_API_KEY;
    // Also ensure empty string case
    vi.resetModules();
    // Re-mock db/next-auth after resetModules (mocks hoisted still apply, but we need to re-stub fetch)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: "hi" } }] }),
      } as Response)
    );

    const { aiChat } = await import("@/lib/ai/router");
    await expect(aiChat({ model: "openai/gpt-4o", messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(
      /NINE_ROUTER_API_KEY/i
    );
  });

  it("/api/ai/chat requires auth (401 without session)", async () => {
    const { getServerSession } = await import("next-auth");
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    // Re-import route after mocking session = null
    const { POST } = await import("@/app/api/ai/chat/route");

    const req = makeJsonRequest("http://localhost:3000/api/ai/chat", {
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "hello" }],
    });

    const res = await POST(req as unknown as Parameters<typeof POST>[0]);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error ?? body.message ?? "").toMatch(/unauthorized/i);
  });

  it("aiDispatch logs to audit_logs with modelUsed", async () => {
    // Setup: mock Role lookup returning a model
    const { db } = await import("@/lib/db");
    (db.role.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "role-1",
      title: "Copywriter",
      divisionId: "div-creative",
      modelVia9Router: "anthropic/claude-3.5-sonnet",
      tools: ["image-gen"],
    });
    (db.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "audit-1" } as never);
    // Also ensure auditLog.create captures second call from route? aiDispatch itself logs
    // Provide second resolve for safety
    (db.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "audit-1" } as never);

    // Ensure fetch returns known content
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "Dispatched result" } }],
          usage: { total_tokens: 20 },
          model: "anthropic/claude-3.5-sonnet",
        }),
      } as Response)
    );

    const { aiDispatch } = await import("@/lib/ai/router");
    const result = await aiDispatch({ roleId: "role-1", task: "Write a tagline" });

    expect(result).toBeDefined();
    // aiDispatch must have called fetch
    expect(fetch).toHaveBeenCalled();

    // audit_logs must have been written with modelUsed
    expect(db.auditLog.create).toHaveBeenCalled();
    const auditCall = (db.auditLog.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
    expect(auditCall?.data?.modelUsed ?? auditCall?.data?.model ?? "").toMatch(/claude/i);
    // also who/action/targetId should be present
    expect(auditCall?.data?.who).toBeDefined();
    expect(auditCall?.data?.action).toBeDefined();
  });

  it("rate limit returns 429 after threshold (30 req/min)", async () => {
    const { getServerSession } = await import("next-auth");
    // Always return same user session so rate limiter hits same bucket
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "user-rate-test", email: "owner@myagency.local", role: "OWNER" },
    });

    // Mock fetch for chat route's upstream call
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "ok" } }],
          usage: { total_tokens: 5 },
          model: "openai/gpt-4o",
        }),
      } as Response)
    );

    const { POST } = await import("@/app/api/ai/chat/route");
    const { resetRateLimit } = await import("@/lib/ai/router");
    // Reset in-memory rate limiter before hammering
    if (typeof resetRateLimit === "function") resetRateLimit();

    let lastRes: Response | null = null;
    for (let i = 0; i < 31; i++) {
      const req = makeJsonRequest("http://localhost:3000/api/ai/chat", {
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: `msg ${i}` }],
      });
      // Need fresh session mock each call because route consumes mock once
      // getServerSession was set to mockResolvedValue (persistent), but if it was once, re-mock
      // Ensure it resolves for each iteration — reset mock to always return same session
      if ((getServerSession as unknown as ReturnType<typeof vi.fn>).mock.calls.length >= 31) {
        // not needed; we used mockResolvedValue which persists
      }
      // Re-ensure mock still resolves (in case it was exhausted)
      if (vi.isMockFunction(getServerSession) && (getServerSession as unknown as ReturnType<typeof vi.fn>).getMockName) {
        // keep as is; mockResolvedValue persists until cleared
      }
      const res = await POST(req as unknown as Parameters<typeof POST>[0]);
      lastRes = res as unknown as Response;
      if (i < 30) {
        // First 30 should NOT be 429
        expect(res.status, `request ${i} should not be rate limited`).not.toBe(429);
      } else {
        // 31st must be 429
        expect(res.status, "31st request should be rate limited 429").toBe(429);
        const body = await res.json().catch(() => ({}));
        expect(JSON.stringify(body).toLowerCase()).toMatch(/rate limit|too many/i);
      }
    }
    expect(lastRes).not.toBeNull();
  });
});
