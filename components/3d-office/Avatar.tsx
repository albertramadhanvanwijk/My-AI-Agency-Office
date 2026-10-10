"use client";

import React from "react";
import type { OfficeStaff } from "@/lib/office/types";

type Props = {
  staff: OfficeStaff;
  onSelect?: (staff: OfficeStaff) => void;
  size?: "sm" | "md";
};

const STATUS_DOT: Record<OfficeStaff["status"], string> = {
  active: "bg-emerald-500 ring-emerald-200",
  standby: "bg-slate-300 ring-slate-200",
  break: "bg-amber-400 ring-amber-200",
};

const STATUS_LABEL: Record<OfficeStaff["status"], string> = {
  active: "online",
  standby: "standby",
  break: "break",
};

export default function Avatar({ staff, onSelect, size = "md" }: Props) {
  const initials = staff.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const dotClass = STATUS_DOT[staff.status] ?? STATUS_DOT.standby;

  return (
    <button
      type="button"
      data-testid="avatar"
      data-staff-id={staff.id}
      data-status={staff.status}
      onClick={() => onSelect?.(staff)}
      className="group relative flex items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${staff.name} — ${staff.title ?? ""}`.trim()}
    >
      <span className="relative inline-flex shrink-0">
        <span
          className={[
            "inline-flex items-center justify-center rounded-full border bg-white font-semibold shadow-sm",
            size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs",
          ].join(" ")}
          aria-hidden="true"
        >
          {initials}
        </span>
        <span
          data-testid="avatar-dot"
          aria-label={STATUS_LABEL[staff.status]}
          title={STATUS_LABEL[staff.status]}
          className={[
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ring-2",
            dotClass,
            size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3",
          ].join(" ")}
        />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-medium leading-none group-hover:underline">{staff.name}</span>
        <span className="truncate text-[11px] leading-none text-muted-foreground">
          {staff.title ?? staff.divisionName ?? staff.status}
        </span>
      </span>
    </button>
  );
}
