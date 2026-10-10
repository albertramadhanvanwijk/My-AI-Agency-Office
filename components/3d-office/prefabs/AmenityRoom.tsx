"use client";

import React from "react";
import type { OfficeRoom } from "@/lib/office/types";

type Props = {
  room: OfficeRoom;
  selected?: boolean;
  onSelect?: (room: OfficeRoom) => void;
};

const AMENITY_META: Record<string, { icon: string; desc: string }> = {
  "room-pantry": { icon: "☕", desc: "Pantry / Cafeteria · kitchen" },
  "room-musholla": { icon: "🕌", desc: "Musholla · quiet near lobby" },
  "room-break": { icon: "🎮", desc: "Break / Game Room · sofa hijau" },
  "room-client-lounge": { icon: "🛋️", desc: "Client Lounge · green sofa" },
};

export default function AmenityRoom({ room, selected, onSelect }: Props) {
  const meta = AMENITY_META[room.id] ?? { icon: room.icon ?? "✦", desc: "Amenity" };
  const label = room.label ?? room.id;
  return (
    <button
      type="button"
      data-testid={`room-card-${room.id}`}
      data-room-id={room.id}
      data-type="amenity"
      onClick={() => onSelect?.(room)}
      aria-pressed={selected ? "true" : "false"}
      className={[
        "flex flex-col rounded-xl border bg-stone-50 p-3 text-left shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300",
        selected ? "ring-2 ring-primary ring-offset-1" : "",
      ].join(" ")}
      style={{ backgroundColor: selected ? undefined : room.color ?? undefined }}
    >
      <span className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border bg-white text-sm">
          {meta.icon}
        </span>
        <span className="truncate text-xs font-semibold">{label}</span>
      </span>
      <span className="mt-1 text-[11px] leading-snug text-muted-foreground">{meta.desc}</span>
      <span data-testid="room-card" className="sr-only">
        {room.id}
      </span>
    </button>
  );
}
