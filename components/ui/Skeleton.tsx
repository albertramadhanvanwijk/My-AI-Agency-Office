"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "card" | "table" | "list" | "circular" | "rectangular";
}

export function Skeleton({
  className,
  variant = "default",
  ...props
}: SkeletonProps) {
  const baseStyles = "animate-pulse bg-muted overflow-hidden rounded";
  
  const variantStyles = {
    default: "h-4 w-full",
    card: "h-32 w-full rounded-xl border",
    table: "h-8 w-full",
    list: "h-12 w-full rounded-lg",
    circular: "h-10 w-10 rounded-full",
    rectangular: "h-4 w-24 rounded-md",
  };

  return (
    <div
      data-testid={`skeleton${variant !== "default" ? `-${variant}` : ""}`}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    />
  );
}

export function SkeletonCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      <Skeleton variant="circular" className="h-12 w-12" />
      <div className="space-y-2">
        <Skeleton variant="rectangular" className="h-4 w-3/4" />
        <Skeleton variant="rectangular" className="h-4 w-1/2" />
      </div>
      <Skeleton variant="rectangular" className="h-4 w-full" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4, className, ...props }: { rows?: number; columns?: number } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton variant="table" key={`header-${i}`} className="flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={`row-${row}`} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, col) => (
            <Skeleton variant="table" key={`cell-${row}-${col}`} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ items = 5, className, ...props }: { items?: number } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={`item-${i}`} className="flex items-center gap-3">
          <Skeleton variant="circular" className="h-10 w-10" />
          <div className="flex-1 space-y-1">
            <Skeleton variant="rectangular" className="h-4 w-3/4" />
            <Skeleton variant="rectangular" className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}