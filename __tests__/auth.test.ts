import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// These env defaults must be set before importing lib/auth / middleware which read process.env
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-secret-32-chars-long-for-testing-12345";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "test-google-client-secret";

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "new-id", email: "new@test.com", name: "New", role: "CLIENT" }),
      update: vi.fn().mockResolvedValue({}),
    },
    client: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

vi.mock("next-auth/jwt", async () => {
  const actual = await vi.importActual<typeof import("next-auth/jwt")>("next-auth/jwt");
  return {
    ...actual,
    getToken: vi.fn(),
  };
});

function makeRequest(pathname: string, url = `http://localhost:3000${pathname}`) {
  // minimal NextRequest mock shape for middleware: nextUrl + url + headers
  const { NextRequest } = require("next/server") as typeof import("next/server");
  // NextRequest expects URL string
  return new NextRequest(url, { method: "GET" });
}

describe("auth — Task 3 (Google + Credentials + role guards)", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXTAUTH_SECRET = "test-secret-32-chars-long-for-testing-12345";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Google provider is configured", async () => {
    const { authOptions } = await import("@/lib/auth");
    const ids = authOptions.providers.map((p: { id: string }) => p.id);
    expect(ids).toContain("google");
  });

  it("Credentials provider is configured", async () => {
    const { authOptions } = await import("@/lib/auth");
    const ids = authOptions.providers.map((p: { id: string }) => p.id);
    expect(ids).toContain("credentials");
  });

  it("session strategy is JWT and pages point to /login (graceful error, not 500)", async () => {
    const { authOptions } = await import("@/lib/auth");
    expect(authOptions.session?.strategy).toBe("jwt");
    // invalid callback should render friendly error via pages.error, not 500
    expect(authOptions.pages?.signIn).toBe("/login");
    expect(authOptions.pages?.error).toBe("/login");
  });

  it("JWT callback attaches role to token and session callback exposes session.user.role + id", async () => {
    const { authOptions } = await import("@/lib/auth");
    expect(authOptions.callbacks?.jwt).toBeDefined();
    expect(authOptions.callbacks?.session).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jwtCb = authOptions.callbacks!.jwt as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionCb = authOptions.callbacks!.session as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>;

    // simulate credentials sign-in where user has role OWNER
    const tokenAfterJwt = await jwtCb({
      token: {},
      user: { id: "u1", email: "owner@test.com", name: "Owner", role: "OWNER" },
      account: null,
      profile: null,
    } as unknown as Record<string, unknown>);

    expect((tokenAfterJwt as { role?: string }).role).toBe("OWNER");
    expect((tokenAfterJwt as { id?: string }).id).toBe("u1");

    const session = await sessionCb({
      session: { user: { name: "", email: "", image: "" }, expires: "" },
      token: tokenAfterJwt,
    } as unknown as Record<string, unknown>) as { user: { role: string; id: string; email: string } };

    expect(session.user.role).toBe("OWNER");
    expect(session.user.id).toBe("u1");
  });

  it("Credentials authorize returns null for invalid password (bcrypt compare)", async () => {
    // need to re-mock db.user.findUnique to return a user with known hash
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("correct-password", 10);
    const { db } = await import("@/lib/db");
    (db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "u2",
      email: "client@test.com",
      name: "Client",
      role: "CLIENT",
      passwordHash: hash,
      avatar: null,
    });

    const { authOptions } = await import("@/lib/auth");
    const credProvider = authOptions.providers.find((p: { id: string }) => p.id === "credentials") as unknown as {
      options: { authorize: (creds: Record<string, string>) => Promise<unknown> };
      authorize: (creds: Record<string, string>) => Promise<unknown>;
    };
    // next-auth v4 stores authorize on .options.authorize (the .authorize is a stub)
    const authorizeFn = (credProvider.options?.authorize ?? credProvider.authorize) as (c: Record<string, string>) => Promise<unknown>;
    expect(authorizeFn).toBeDefined();

    const ok = await authorizeFn({ email: "client@test.com", password: "correct-password" });
    expect(ok).not.toBeNull();
    expect((ok as { role: string }).role).toBe("CLIENT");

    (db.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: "u2",
      email: "client@test.com",
      name: "Client",
      role: "CLIENT",
      passwordHash: hash,
      avatar: null,
    });
    const bad = await authorizeFn({ email: "client@test.com", password: "wrong" });
    expect(bad).toBeNull();
  });

  it("middleware redirects unauthenticated /projects to /login", async () => {
    const { getToken } = await import("next-auth/jwt");
    (getToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { middleware } = await import("@/middleware");
    const req = makeRequest("/projects");
    const res = await middleware(req as unknown as Parameters<typeof middleware>[0]);
    // NextResponse.redirect -> status 307/308 and Location contains /login
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const loc = res.headers.get("location") || res.headers.get("Location") || "";
    expect(loc).toMatch(/\/login/);
  });

  it("CLIENT cannot access /projects (redirect to /portal or /login)", async () => {
    const { getToken } = await import("next-auth/jwt");
    (getToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ role: "CLIENT", email: "client@test.com", sub: "c1" });

    const { middleware } = await import("@/middleware");
    const req = makeRequest("/projects");
    const res = await middleware(req as unknown as Parameters<typeof middleware>[0]);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const loc = (res.headers.get("location") || res.headers.get("Location") || "").toString();
    // must not allow through (not 200) and should redirect away from projects
    expect(loc).not.toMatch(/\/projects/);
    // acceptable targets are /login or /portal
    expect(loc).toMatch(/\/login|\/portal/);
  });

  it("OWNER can access /projects (next)", async () => {
    const { getToken } = await import("next-auth/jwt");
    (getToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ role: "OWNER", email: "owner@test.com", sub: "o1" });

    const { middleware } = await import("@/middleware");
    const req = makeRequest("/projects");
    const res = await middleware(req as unknown as Parameters<typeof middleware>[0]);
    // NextResponse.next() returns 200-ish with x-middleware-next header or empty redirect
    // It should NOT be a redirect to login
    const loc = res.headers.get("location") || res.headers.get("Location") || "";
    expect(loc).not.toMatch(/\/login/);
    // status 200 (next) not a redirect
    expect([200, 307, 308].includes(res.status)).toBe(true);
    if (res.status >= 300 && res.status < 400) {
      // if still redirect, should not be login
      expect(loc).not.toContain("/login");
    }
  });

  it("unauthenticated /portal redirects to /login", async () => {
    const { getToken } = await import("next-auth/jwt");
    (getToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { middleware } = await import("@/middleware");
    const req = makeRequest("/portal");
    const res = await middleware(req as unknown as Parameters<typeof middleware>[0]);
    expect(res.status).toBeGreaterThanOrEqual(300);
    const loc = res.headers.get("location") || res.headers.get("Location") || "";
    expect(loc).toMatch(/\/login/);
  });

  it("authenticated CLIENT can access /portal (next)", async () => {
    const { getToken } = await import("next-auth/jwt");
    (getToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ role: "CLIENT", email: "client@test.com", sub: "c1" });

    const { middleware } = await import("@/middleware");
    const req = makeRequest("/portal/projects/abc");
    const res = await middleware(req as unknown as Parameters<typeof middleware>[0]);
    const loc = res.headers.get("location") || res.headers.get("Location") || "";
    expect(loc).not.toMatch(/\/login/);
  });

  it("unauthenticated /api/projects returns 401 (not redirect)", async () => {
    const { getToken } = await import("next-auth/jwt");
    (getToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const { middleware } = await import("@/middleware");
    const req = makeRequest("/api/projects");
    const res = await middleware(req as unknown as Parameters<typeof middleware>[0]);
    expect(res.status).toBe(401);
  });

  it("CLIENT cannot access /admin (redirect to /portal)", async () => {
    const { getToken } = await import("next-auth/jwt");
    (getToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ role: "CLIENT", email: "client@test.com", sub: "c1" });

    const { middleware } = await import("@/middleware");
    const req = makeRequest("/admin");
    const res = await middleware(req as unknown as Parameters<typeof middleware>[0]);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const loc = (res.headers.get("location") || res.headers.get("Location") || "").toString();
    expect(loc).toMatch(/\/portal|\/login/);
  });

  it("OWNER can access /admin (next)", async () => {
    const { getToken } = await import("next-auth/jwt");
    (getToken as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ role: "OWNER", email: "owner@test.com", sub: "o1" });

    const { middleware } = await import("@/middleware");
    const req = makeRequest("/admin");
    const res = await middleware(req as unknown as Parameters<typeof middleware>[0]);
    const loc = res.headers.get("location") || res.headers.get("Location") || "";
    expect(loc).not.toMatch(/\/login/);
    expect(loc).not.toMatch(/\/portal/);
    // OWNER should not be redirected away from /admin
    if (res.status >= 300 && res.status < 400) {
      expect(loc).not.toContain("/login");
      expect(loc).not.toContain("/portal");
    }
  });
});
