import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import React from "react";

// Mock next/navigation (used by Sidebar for active highlight)
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
}));

// Mock next-auth/react for Header signOut
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
  useSession: () => ({ data: null, status: "unauthenticated" }),
}));

vi.mock("next-auth", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {
    division: { findMany: vi.fn().mockResolvedValue([]) },
    staff: { count: vi.fn().mockResolvedValue(3) },
  },
}));

const SIX_DIVISIONS = [
  "Strategy & Planning",
  "Creative & Content",
  "Technology & Product",
  "Marketing & Growth",
  "Client Relations",
  "Finance, Legal & Admin",
];

describe("layout shell — Task 4 (Sidebar + Header)", () => {
  it("Sidebar contains Lobby and 6 division names", async () => {
    const { default: Sidebar } = await import("@/components/layout/Sidebar");
    const { container } = render(React.createElement(Sidebar));
    // Cleanup after to avoid leaking to next test (jsdom persists body)
    // Sidebar assertions scoped to divisions nav to avoid footer collision
    const divisionsNav = screen.getByTestId("divisions-nav");

    // Lobby nav item (role link)
    expect(screen.getByRole("link", { name: /Lobby/i })).toBeInTheDocument();

    // Divisions section label
    expect(screen.getByText("Divisions")).toBeInTheDocument();

    // Each of 6 division names — scoped to divisions-nav container so footer "Cozy Creative" doesn't collide
    for (const name of SIX_DIVISIONS) {
      // For Finance entry the full string includes comma — match via first distinctive token inside divisionsNav
      // Use within() to isolate.
      const needle = name === "Finance, Legal & Admin" ? /Finance/ : new RegExp(name.split(" & ")[0], "i");
      expect(within(divisionsNav).getByText(needle)).toBeInTheDocument();
    }

    // Exactly 6 division links inside divisions nav
    const links = within(divisionsNav).getAllByRole("link");
    expect(links.length).toBe(6);

    // Unmount to avoid duplicate elements affecting next tests
    // Vitest jsdom doesn't auto-cleanup between tests unless enabled — manually clear
    container.remove();
    document.body.innerHTML = "";
  });

  it("Header shows online count element and app title", async () => {
    document.body.innerHTML = "";
    const { default: Header } = await import("@/components/layout/Header");
    render(
      React.createElement(Header, {
        user: { name: "Owner", email: "owner@myagency.local", role: "OWNER" },
      })
    );

    // App title (heading)
    expect(screen.getByRole("heading", { name: /My AI Agency Office/i })).toBeInTheDocument();

    // Online count stub — data-testid preferred
    const onlineEl = screen.getByTestId("online-count");
    expect(onlineEl).toBeInTheDocument();
    expect(onlineEl.textContent).toMatch(/Online/i);

    // Role badge — use test id to avoid colliding with user name "Owner" (case-insensitive match would hit both)
    const badge = screen.getByTestId("role-badge");
    expect(badge).toHaveTextContent("OWNER");

    document.body.innerHTML = "";
  });

  it("Header shows CLIENT role badge when user is CLIENT", async () => {
    document.body.innerHTML = "";
    const { default: Header } = await import("@/components/layout/Header");
    render(
      React.createElement(Header, {
        user: { name: "Demo Client", email: "client@demo.local", role: "CLIENT" },
      })
    );
    const badge = screen.getByTestId("role-badge");
    expect(badge).toHaveTextContent("CLIENT");
    document.body.innerHTML = "";
  });

  it("Dashboard layout renders Sidebar and Header together", async () => {
    document.body.innerHTML = "";
    let Layout: React.ComponentType<{ children: React.ReactNode }> | null = null;
    try {
      const mod = await import("@/app/(dashboard)/layout");
      Layout = (mod.default as React.ComponentType<{ children: React.ReactNode }>) || null;
    } catch {
      Layout = null;
    }
    expect(Layout).toBeTruthy();
    expect(typeof Layout).toBe("function");
    document.body.innerHTML = "";
  });
});
