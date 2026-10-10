"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

export function SheetContent({
  side = "left",
  className,
  children,
  onClose,
}: {
  side?: "left" | "right";
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className={cn(
        "relative flex h-full w-72 max-w-[85vw] flex-col bg-card shadow-xl",
        side === "left" ? "animate-in" : "ml-auto",
        className
      )}
    >
      {onClose && (
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1.5 hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  );
}
