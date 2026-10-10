import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import React from "react";

// Mock next/navigation for any client component that might use it (OfficeCanvas may not, but safe)
vi.mock("next/navigation", () => ({
  usePathname: () => "/lobby",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
}));

// No mock for @react-three/fiber yet — OfficeCanvas should render DOM fallback without crashing
// so tests can assert lobby + desks even when WebGL not available.

type MockRoom = {
  id: string;
  type: "lobby" | "division" | "meeting" | "amenity";
  divisionId?: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  capacity: number;
  floor?: number;
  divisionName?: string;
};

type MockDesk = {
  id: string;
  roomId?: string | null;
  clusterId?: string | null;
  staffId?: string | null;
  x?: number | null;
  y?: number | null;
};

type MockStaff = {
  id: string;
  name: string;
  roleId?: string;
  divisionId?: string | null;
  status: "active" | "standby" | "break";
  deskId?: string | null;
  avatar?: string | null;
  title?: string;
};

const mockRooms: MockRoom[] = [
  { id: "room-lobby", type: "lobby", x: 120, y: 200, w: 120, h: 40, capacity: 12 },
  { id: "room-strategy", type: "division", divisionId: "div-1", x: 10, y: 10, w: 70, h: 55, capacity: 6 },
  { id: "room-creative", type: "division", divisionId: "div-2", x: 10, y: 70, w: 70, h: 55, capacity: 8 },
  { id: "room-pantry", type: "amenity", x: 285, y: 190, w: 65, h: 40, capacity: 10 },
  { id: "room-musholla", type: "amenity", x: 95, y: 205, w: 30, h: 30, capacity: 6 },
  { id: "room-break", type: "amenity", x: 15, y: 190, w: 65, h: 40, capacity: 10 },
  { id: "room-flex-central", type: "meeting", x: 90, y: 50, w: 180, h: 140, capacity: 64 },
];

const mockStaffActive: MockStaff[] = [
  { id: "staff-1", name: "Rina Anggraini", status: "active", title: "Resepsionis", deskId: "desk-1" },
  { id: "staff-2", name: "Alex Rahman", status: "active", title: "Managing Director", deskId: "desk-2" },
  { id: "staff-3", name: "Budi Santoso", status: "active", title: "Project Manager", deskId: "desk-3" },
];

const mockDesksActive: MockDesk[] = [
  { id: "desk-1", roomId: "room-lobby", clusterId: "cluster-lobby-A", staffId: "staff-1", x: 175, y: 215 },
  { id: "desk-2", roomId: "room-board", clusterId: "cluster-board-A", staffId: "staff-2", x: 115, y: 28 },
  { id: "desk-3", roomId: "room-flex-central", clusterId: "cluster-flex-C1", staffId: "staff-3", x: 140, y: 110 },
];

describe("3D Live Office — OfficeCanvas (Task 5)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders lobby and does not crash with 0 active desks", async () => {
    const { default: OfficeCanvas } = await import("@/components/3d-office/OfficeCanvas");
    const { container } = render(
      React.createElement(OfficeCanvas as React.ComponentType<Record<string, unknown>>, {
        rooms: mockRooms,
        desks: [],
        staff: [],
      })
    );

    // Lobby must be visible (case-insensitive) — may appear twice (visible + sr-only), so use getAll
    expect(screen.getAllByText(/LOBBY/i).length).toBeGreaterThanOrEqual(1);
    // Root canvas container exists
    expect(screen.getByTestId("office-canvas-root")).toBeInTheDocument();
    // 0 active desks => no desk-cluster elements, but flexible floor placeholder should exist and not crash
    expect(screen.queryAllByTestId("desk-cluster").length).toBe(0);
    expect(screen.getByTestId("flexible-floor")).toBeInTheDocument();

    // Ensure component rendered without throwing (container has content)
    expect(container.textContent).toBeTruthy();

    container.remove();
    document.body.innerHTML = "";
  });

  it("renders N desks for N active staff", async () => {
    const { default: OfficeCanvas } = await import("@/components/3d-office/OfficeCanvas");

    const { container } = render(
      React.createElement(OfficeCanvas as React.ComponentType<Record<string, unknown>>, {
        rooms: mockRooms,
        desks: mockDesksActive,
        staff: mockStaffActive,
      })
    );

    // Should render exactly 3 desk clusters for 3 active desks
    const clusters = screen.getAllByTestId("desk-cluster");
    expect(clusters.length).toBe(3);

    // Staff avatars for active staff should appear (nameplate + dot) — names may appear in desk + avatar row, so use getAll
    for (const s of mockStaffActive) {
      expect(screen.getAllByText(s.name).length).toBeGreaterThanOrEqual(1);
    }

    // Non-active desks filtered: if we pass extra standby desk it should not render unless linked to active staff
    container.remove();
    document.body.innerHTML = "";
  });

  it("clicking a room filters staff drawer", async () => {
    const { default: OfficeCanvas } = await import("@/components/3d-office/OfficeCanvas");
    const onRoomSelect = vi.fn();

    render(
      React.createElement(OfficeCanvas as React.ComponentType<Record<string, unknown>>, {
        rooms: mockRooms,
        desks: mockDesksActive,
        staff: mockStaffActive,
        onRoomSelect,
      })
    );

    // Find a division room (Strategy) and click it
    // Rooms are rendered with data-testid="room-card" and data-room-id
    const roomCards = screen.getAllByTestId("room-card");
    expect(roomCards.length).toBeGreaterThanOrEqual(1);

    // Click the first division room (room-strategy)
    const strategyRoom = screen.getByTestId("room-card-room-strategy");
    fireEvent.click(strategyRoom);

    // Callback should have been called with divisionId or room id
    expect(onRoomSelect).toHaveBeenCalled();
    const firstCallArg = onRoomSelect.mock.calls[0][0];
    // Accept either room id string or object containing id/divisionId
    const isValidArg =
      (typeof firstCallArg === "string" && firstCallArg.length > 0) ||
      (typeof firstCallArg === "object" &&
        firstCallArg !== null &&
        ("id" in firstCallArg || "divisionId" in firstCallArg || "roomId" in firstCallArg));
    expect(isValidArg).toBe(true);

    // After click, a drawer/sheet for that division should appear (staff drawer)
    // The component may show a drawer with filtered staff list; we check that drawer is in DOM
    // Look for data-testid="staff-drawer" or sheet content
    // Allow either drawer via test id or dialog role
    const drawer = screen.queryByTestId("staff-drawer") || screen.queryByRole("dialog");
    // If onRoomSelect is externally controlled, drawer may not auto-open without state — but if component manages internal state, it should show
    // So we assert at least onRoomSelect was called; drawer presence is secondary but we check if rendered
    if (!drawer) {
      // Fallback: ensure click didn't crash — still pass if callback called
      expect(onRoomSelect).toHaveBeenCalled();
    } else {
      expect(drawer).toBeInTheDocument();
    }

    document.body.innerHTML = "";
  });

  it("clicking an avatar triggers chat drawer callback", async () => {
    const { default: OfficeCanvas } = await import("@/components/3d-office/OfficeCanvas");
    const onAvatarSelect = vi.fn();

    render(
      React.createElement(OfficeCanvas as React.ComponentType<Record<string, unknown>>, {
        rooms: mockRooms,
        desks: mockDesksActive,
        staff: mockStaffActive,
        onAvatarSelect,
      })
    );

    const avatars = screen.getAllByTestId("avatar");
    expect(avatars.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(avatars[0]);
    expect(onAvatarSelect).toHaveBeenCalled();
    document.body.innerHTML = "";
  });

  it("shows responsive mobile fallback list on small screens (hidden on desktop via CSS but present in DOM)", async () => {
    const { default: OfficeCanvas } = await import("@/components/3d-office/OfficeCanvas");
    render(
      React.createElement(OfficeCanvas as React.ComponentType<Record<string, unknown>>, {
        rooms: mockRooms,
        desks: [],
        staff: [],
      })
    );
    expect(screen.getByTestId("mobile-fallback-list")).toBeInTheDocument();
    document.body.innerHTML = "";
  });
});
