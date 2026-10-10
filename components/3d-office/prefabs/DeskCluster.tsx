"use client";

import React from "react";
import type { OfficeDesk, OfficeStaff } from "@/lib/office/types";
import Avatar from "../Avatar";

type Props = {
  desk: OfficeDesk;
  staff?: OfficeStaff | null;
  onAvatarSelect?: (staff: OfficeStaff) => void;
  compact?: boolean;
};

/**
 * DOM fallback for a desk cluster — single desk card (flexible floor uses many of these;
 * only active desks are passed in by OfficeCanvas).
 */
export default function DeskCluster({ desk, staff, onAvatarSelect, compact }: Props) {
  return (
    <div
      data-testid="desk-cluster"
      data-desk-id={desk.id}
      data-staff-id={staff?.id ?? ""}
      data-room-id={desk.roomId ?? ""}
      data-cluster-id={desk.clusterId ?? ""}
      className={[
        "relative flex flex-col rounded-xl border bg-white p-2 shadow-sm",
        compact ? "p-1.5" : "p-3",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-amber-50 text-[11px] font-semibold text-amber-900"
          title={desk.clusterId ?? desk.id}
        >
          ▭
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium leading-none">{desk.clusterId ?? desk.id}</p>
          <p className="truncate text-[11px] leading-none text-muted-foreground">
            {desk.roomId ?? "flex"}
          </p>
        </div>
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-emerald-50 text-[10px]">
          🌱
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2 border-t pt-2">
        {staff ? (
          <Avatar staff={staff} onSelect={onAvatarSelect ? () => onAvatarSelect(staff) : undefined} size="sm" />
        ) : (
          <span className="text-[11px] italic text-muted-foreground">Empty · flexible floor</span>
        )}
      </div>
    </div>
  );
}
