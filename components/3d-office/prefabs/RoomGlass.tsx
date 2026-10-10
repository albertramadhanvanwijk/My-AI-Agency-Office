"use client";

import React from "react";
import type { OfficeRoom } from "@/lib/office/types";

type Props = {
  room: OfficeRoom;
  selected?: boolean;
  onSelect?: (room: OfficeRoom) => void;
  compact?: boolean;
};

/**
 * DOM fallback prefab for RoomGlass — renders a cozy glass room card.
 * R3F mesh variant is in OfficeCanvasR3F; this is used when WebGL not available / in tests.
 */
export default function RoomGlass({ room, selected, onSelect, compact }: Props) {
  const isLobby = room.type === "lobby";
  const isAmenity = room.type === "amenity";
  const label = room.label ?? room.id;

  return (
    <button
      type="button"
      data-testid={`room-card-${room.id}`}
      data-room-id={room.id}
      data-testid-room="room-card"
      // Keep both selectors for test compatibility: data-testid="room-card" via attribute below is duplicated, so use primary id
      // Provide generic room-card test id via aria-label fallback if needed — tests query getAllByTestId("room-card")
      onClick={() => onSelect?.(room)}
      aria-label={label}
      aria-pressed={selected ? "true" : "false"}
      data-type={room.type}
      data-division-id={room.divisionId ?? ""}
      className={[
        "group relative flex flex-col rounded-xl border text-left shadow-sm transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isLobby
          ? "bg-amber-50/90 border-amber-200 hover:bg-amber-50"
          : isAmenity
            ? "bg-stone-50 border-stone-200 hover:bg-stone-50"
            : "bg-white/90 border-slate-200 hover:bg-white",
        selected ? "ring-2 ring-primary ring-offset-1" : "",
        compact ? "p-2" : "p-3",
      ].join(" ")}
      style={{
        // Subtle warm glass + wood accent
        backgroundColor: selected ? undefined : room.color ?? undefined,
        // Use room w/h as hint for desktop grid sizing via CSS variables if needed
      }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-xl border border-white/50 bg-gradient-to-br from-white/40 to-transparent"
      />
      <span className="relative flex items-center gap-1.5">
        <span
          className={[
            "inline-flex h-2.5 w-2.5 shrink-0 rounded-full border",
            room.type === "division" ? "bg-sky-400 border-sky-500" : room.type === "lobby" ? "bg-amber-400 border-amber-500" : "bg-emerald-400 border-emerald-500",
          ].join(" ")}
        />
        <span className="truncate text-xs font-semibold tracking-tight">
          {isAmenity && room.icon ? `${room.icon} ` : ""}
          {label}
        </span>
        <span className="ml-auto text-[10px] leading-none text-muted-foreground uppercase tracking-wide">
          {room.type}
        </span>
      </span>
      <span className="relative mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
        {isLobby ? "Reception · 2 glass doors" : isAmenity ? "Amenity" : `Cap ${room.capacity} · ${room.id}`}
      </span>
      {/* Proxy element with generic test id so getAllByTestId("room-card") works: render hidden span */}
      <span data-testid="room-card" className="sr-only" aria-hidden="true">
        {room.id}
      </span>
    </button>
  );
}
