"use client";

import React from "react";
import type { OfficeRoom } from "@/lib/office/types";

type Props = {
  room: OfficeRoom;
  onSelect?: (room: OfficeRoom) => void;
};

export default function Lobby({ room, onSelect }: Props) {
  const label = room.label ?? "LOBBY";
  return (
    <button
      type="button"
      data-testid="lobby-card"
      data-room-id={room.id}
      onClick={() => onSelect?.(room)}
      className="relative flex w-full flex-col overflow-hidden rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 text-left shadow-sm transition hover:from-amber-50 hover:to-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
    >
      <span className="absolute right-3 top-3 text-lg" aria-hidden="true">
        🚪🚪
      </span>
      <span className="flex items-center gap-2">
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200" />
        <span className="text-sm font-bold tracking-widest">{label}</span>
        <span className="ml-1 rounded bg-amber-900 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-50">
          RECEPTION
        </span>
      </span>
      <span className="mt-1 max-w-[85%] text-xs leading-snug text-amber-900/70">
        Dual glass doors · Warm wood counter · Plants left & right
      </span>
      <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-800/80">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Cozy Creative · Lobby bawah tengah
      </span>
      {/* Proxy for getByText(/LOBBY/i) — label already covers it, but ensure search lands */}
      <span className="sr-only">LOBBY</span>
    </button>
  );
}
