import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("/api/health", () => {
  const ORIGINAL = { ...process.env };

  beforeEach(() => {
    process.env = { ...ORIGINAL, NEXTAUTH_SECRET: "test-secret-for-toolchain" };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = ORIGINAL;
    vi.resetModules();
  });

  it("GET returns 200 and JSON contains status ok", async () => {
    const { GET } = await import("@/app/api/health/route");

    const res = await GET();
    expect(res.status).toBe(200);

    const json = (await res.json()) as Record<string, unknown>;
    expect(json.status).toBe("ok");
    expect(typeof json.ts).toBe("string");
    // ISO timestamp
    expect(() => new Date(json.ts as string).toISOString()).not.toThrow();
  });

  it("includes version, uptime, and db fields without leaking secrets", async () => {
    const { GET } = await import("@/app/api/health/route");
    const res = await GET();
    const json = (await res.json()) as Record<string, unknown>;

    expect(typeof json.version).toBe("string");
    expect((json.version as string).length).toBeGreaterThan(0);

    expect(typeof json.uptime).toBe("number");

    // db: "ok" or "fail" — health is local-first, 200 even without DB
    expect(["ok", "fail"]).toContain(json.db);
    expect(typeof json.dbLatencyMs).toBe("number");

    // Must not leak sensitive env
    const dumped = JSON.stringify(json);
    expect(dumped).not.toContain("NINE_ROUTER_API_KEY");
    expect(dumped).not.toContain("DATABASE_URL");
    expect(dumped).not.toContain("NEXTAUTH_SECRET");
    expect(dumped).not.toContain("GOOGLE_CLIENT_SECRET");
  });

  it("is force-dynamic and returns JSON content-type", async () => {
    const mod = await import("@/app/api/health/route");
    expect(mod.dynamic).toBe("force-dynamic");

    const res = await mod.GET();
    const ct = res.headers.get("content-type") ?? "";
    expect(ct).toMatch(/application\/json/i);
  });
});
