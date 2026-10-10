import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("toolchain", () => {
  const ORIGINAL = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL, NEXTAUTH_SECRET: "test-secret-for-toolchain" };
  });

  afterEach(() => {
    process.env = ORIGINAL;
    vi.resetModules();
  });

  it("exports env from lib/env", async () => {
    const mod = await import("@/lib/env");
    expect(mod.env).toBeDefined();
    expect(mod.env.NEXTAUTH_SECRET).toBe("test-secret-for-toolchain");
  });

  it("throws when NEXTAUTH_SECRET is missing", async () => {
    delete process.env.NEXTAUTH_SECRET;
    vi.resetModules();
    await expect(import("@/lib/env")).rejects.toThrow(/NEXTAUTH_SECRET/i);
  });

  it("smoke: app page renders heading", async () => {
    const { render, screen } = await import("@testing-library/react");
    const HomePage = (await import("@/app/page")).default;
    render(HomePage());
    expect(screen.getByText(/My AI Agency Office/i)).toBeInTheDocument();
  });
});
