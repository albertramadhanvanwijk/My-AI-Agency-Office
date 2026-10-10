"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { OfficeRoom, OfficeDesk, OfficeStaff } from "@/lib/office/types";
import RoomGlass from "./prefabs/RoomGlass";
import Lobby from "./prefabs/Lobby";
import AmenityRoom from "./prefabs/AmenityRoom";
import DeskCluster from "./prefabs/DeskCluster";
import Avatar from "./Avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, MessageSquare, Users } from "lucide-react";

// R3F is WebGL-only — load client-side, never during SSR / Vitest jsdom
const OfficeCanvasR3F = dynamic(() => import("./OfficeCanvasR3F"), {
  ssr: false,
  loading: () => null,
});

type Props = {
  rooms: OfficeRoom[];
  desks: OfficeDesk[];
  staff: OfficeStaff[];
  onRoomSelect?: (payload: { id: string; divisionId?: string | null; roomId: string; type: string; label?: string }) => void;
  onAvatarSelect?: (payload: { staffId: string; name: string; deskId?: string | null }) => void;
};

export default function OfficeCanvas({ rooms, desks, staff, onRoomSelect, onAvatarSelect }: Props) {
  const safeRooms = useMemo(() => (Array.isArray(rooms) ? rooms : []), [rooms]);
  const safeDesks = useMemo(() => (Array.isArray(desks) ? desks : []), [desks]);
  const safeStaff = useMemo(() => (Array.isArray(staff) ? staff : []), [staff]);

  const staffById = useMemo(() => new Map(safeStaff.map((s) => [s.id, s] as const)), [safeStaff]);

  const activeDesks = useMemo(() => {
    if (!safeDesks.length || !safeStaff.length) return [];
    return safeDesks.filter((d) => {
      if (!d.staffId) return false;
      const s = staffById.get(d.staffId);
      return !!s && s.status === "active";
    });
  }, [safeDesks, safeStaff, staffById]);

  // Also compute activeStaff list for drawer header count
  const activeStaffCount = useMemo(
    () => safeStaff.filter((s) => s.status === "active").length,
    [safeStaff]
  );

  const [selectedRoom, setSelectedRoom] = useState<OfficeRoom | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<OfficeStaff | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const handleRoomSelect = (room: OfficeRoom) => {
    setSelectedRoom(room);
    setDrawerOpen(true);
    onRoomSelect?.({
      id: room.id,
      divisionId: room.divisionId ?? null,
      roomId: room.id,
      type: room.type,
      label: room.label ?? room.id,
    });
  };

  const handleAvatarSelect = (s: OfficeStaff) => {
    setSelectedStaff(s);
    setChatOpen(true);
    onAvatarSelect?.({ staffId: s.id, name: s.name, deskId: s.deskId ?? null });
  };

  const filteredStaff = useMemo(() => {
    if (!selectedRoom) return [];
    if (selectedRoom.type === "lobby") return safeStaff.filter((s) => s.status === "active");
    if (selectedRoom.divisionId) {
      return safeStaff.filter((s) => s.divisionId === selectedRoom.divisionId);
    }
    // meeting / amenity without division -> show active staff in that room's desks
    const deskStaffIds = new Set(
      activeDesks.filter((d) => d.roomId === selectedRoom.id).map((d) => d.staffId!)
    );
    if (deskStaffIds.size) return safeStaff.filter((s) => deskStaffIds.has(s.id));
    return [];
  }, [selectedRoom, safeStaff, activeDesks]);

  const lobbyRoom = safeRooms.find((r) => r.type === "lobby");
  const otherRooms = safeRooms.filter((r) => r.type !== "lobby");

  return (
    <div data-testid="office-canvas-root" className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold tracking-tight">3D Live Office</h2>
        <Badge variant="outline" className="gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {activeStaffCount} active
        </Badge>
        <span className="text-xs text-muted-foreground">
          Isometric · {safeRooms.length} rooms · {activeDesks.length} desks live
        </span>
      </div>

      {/* Desktop 3D + 2D fallback — R3F on desktop, DOM grid below for testability & fallback */}
      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
        {/* R3F Canvas — hidden on mobile, desktop shows true 3D (gracefully degrades if WebGL unavailable) */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Isometric Diorama</CardTitle>
            <CardDescription className="text-xs">
              Cozy Creative · fix camera ~30° top-down · Lobby bawah tengah · 4+4+3 perimeter
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* R3F container — aspect cozy */}
            <div
              data-testid="r3f-container"
              className="relative h-[320px] w-full bg-amber-50/20 lg:h-[520px]"
              style={{ background: "radial-gradient(ellipse at 30% 20%, #fffbeb 0%, #fdf8f0 55%, #fafaf9 100%)" }}
            >
              {/* Only render R3F when window exists and not in Vitest (avoid WebGL in jsdom) */}
              <div className="hidden h-full w-full lg:block">
                {typeof window !== "undefined" && safeRooms.length > 0 ? (
                  <OfficeCanvasR3F
                    rooms={safeRooms}
                    desks={activeDesks}
                    staff={safeStaff}
                    onRoomSelect={handleRoomSelect}
                    onAvatarSelect={handleAvatarSelect}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-6 text-center">
                    <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                      3D preview — Lobby persegi cozy · perimeter kaca · tengah flexible floor
                    </p>
                  </div>
                )}
              </div>
              {/* Mobile fallback inside card */}
              <div className="flex h-full items-center justify-center p-4 lg:hidden">
                <p className="text-center text-xs text-muted-foreground">
                  Tap rooms below — mobile uses list view. Desktop shows full 3D.
                </p>
              </div>
            </div>

            {/* Flexible floor indicator — always rendered, never crashes at 0 desks */}
            <div
              data-testid="flexible-floor"
              className="flex items-center gap-2 border-t bg-stone-50 px-3 py-2 text-xs text-muted-foreground"
            >
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              Flexible floor — polish + tanaman · {activeDesks.length === 0 ? "empty, ready for N active desks" : `${activeDesks.length} active desks live`}
              <span className="ml-auto hidden items-center gap-1 text-[11px] sm:inline-flex">
                🌱 cozy · low-poly · frustum cull
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Right: Rooms + Desks DOM fallback (also drives tests without WebGL) */}
        <div className="flex flex-col gap-4">
          {lobbyRoom ? (
            <Lobby room={lobbyRoom} onSelect={handleRoomSelect} />
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold tracking-widest">LOBBY</p>
              <p className="text-xs text-muted-foreground">Lobby bawah tengah — always rendered even with 0 desks</p>
            </div>
          )}

          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Rooms · click to filter staff drawer
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {otherRooms.map((r) =>
                r.type === "amenity" ? (
                  <AmenityRoom
                    key={r.id}
                    room={r}
                    selected={selectedRoom?.id === r.id}
                    onSelect={handleRoomSelect}
                  />
                ) : (
                  <RoomGlass
                    key={r.id}
                    room={r}
                    selected={selectedRoom?.id === r.id}
                    onSelect={handleRoomSelect}
                  />
                )
              )}
              {otherRooms.length === 0 && (
                <p className="col-span-2 rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No rooms — seed will populate foto layout (14 + 3 amenity)
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Desks · only N active rendered
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {activeDesks.map((d) => {
                const s = d.staffId ? staffById.get(d.staffId) ?? null : null;
                return (
                  <DeskCluster
                    key={d.id}
                    desk={d}
                    staff={s ?? undefined}
                    onAvatarSelect={handleAvatarSelect}
                  />
                );
              })}
              {activeDesks.length === 0 && (
                <div className="col-span-2 rounded-xl border border-dashed bg-muted/30 p-4 text-center">
                  <p className="text-xs font-medium">No active desks</p>
                  <p className="mx-auto mt-1 max-w-[28ch] text-[11px] leading-snug text-muted-foreground">
                    Flexible floor fills empty space with polish + tanaman. Activate staff to spawn desks.
                  </p>
                </div>
              )}
            </div>
            {/* Avatars row for quick chat — also ensures Avatar rendering without needing DeskCluster in isolation */}
            {safeStaff.filter((s) => s.status === "active").length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {safeStaff
                  .filter((s) => s.status === "active")
                  .slice(0, 12)
                  .map((s) => (
                    <Avatar key={s.id} staff={s} onSelect={() => handleAvatarSelect(s)} size="sm" />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile fallback list — always in DOM, CSS-hidden on desktop */}
      <div
        data-testid="mobile-fallback-list"
        className="rounded-xl border bg-card p-3 lg:hidden"
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Mobile list fallback
        </p>
        <ul className="space-y-1.5 text-xs">
          {safeRooms.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border bg-muted/20 px-2.5 py-1.5"
            >
              <span className="truncate font-medium">
                {r.icon ? `${r.icon} ` : ""}
                {r.label ?? r.id}
              </span>
              <span className="ml-2 shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {r.type}
              </span>
            </li>
          ))}
          {activeDesks.length > 0 && (
            <li className="pt-1 text-[11px] text-muted-foreground">
              {activeDesks.length} active desks · {safeStaff.filter((s) => s.status === "active").map((s) => s.name).join(", ")}
            </li>
          )}
        </ul>
      </div>

      {/* Staff drawer — opens on room click */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-[360px] max-w-[92vw] overflow-y-auto p-0"
          onClose={() => setDrawerOpen(false)}
        >
          <div data-testid="staff-drawer" role="dialog" aria-label="Staff drawer" className="flex h-full flex-col">
            <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-card px-4 py-3">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">
                {selectedRoom?.label ?? selectedRoom?.id ?? "Staff"}
              </h3>
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">{filteredStaff.length}</span>
              <button
                aria-label="Close"
                onClick={() => setDrawerOpen(false)}
                className="ml-auto rounded-md p-1.5 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1 p-3">
              <p className="px-1 pb-1 text-xs text-muted-foreground">
                {selectedRoom
                  ? `Room ${selectedRoom.id} · ${selectedRoom.type}${selectedRoom.divisionId ? ` · ${selectedRoom.divisionId}` : ""}`
                  : "Select a room on the canvas"}
              </p>
              {filteredStaff.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  No staff in this room yet. Activate from HR or dispatch via project.
                </p>
              ) : (
                filteredStaff.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-muted/40"
                  >
                    <Avatar staff={s} onSelect={() => handleAvatarSelect(s)} size="sm" />
                    <Button variant="ghost" size="sm" onClick={() => handleAvatarSelect(s)} aria-label={`Chat ${s.name}`}>
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Chat drawer — opens on avatar click */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="w-[380px] max-w-[92vw] p-0" onClose={() => setChatOpen(false)}>
          <div data-testid="chat-drawer" role="dialog" aria-label="Chat drawer" className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <MessageSquare className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">
                Chat — {selectedStaff?.name ?? "Select avatar"}
              </h3>
              <button
                aria-label="Close"
                onClick={() => setChatOpen(false)}
                className="ml-auto rounded-md p-1.5 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selectedStaff ? (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <Avatar staff={selectedStaff} size="md" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{selectedStaff.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedStaff.title ?? ""} · {selectedStaff.status}
                      </p>
                    </div>
                    <Badge
                      variant={selectedStaff.status === "active" ? "success" : "secondary"}
                      className="ml-auto"
                    >
                      {selectedStaff.status}
                    </Badge>
                  </div>
                  <div className="rounded-xl border bg-muted/30 p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      Chat drawer — wire to <code className="rounded bg-muted px-1 py-0.5">/chat</code> or direct conversation in Fase 9/11.
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setChatOpen(false)}>
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Click an avatar on the canvas to open chat.</p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
