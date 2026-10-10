"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "primary" | "muted";
  label?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

const variantClasses = {
  default: "text-primary",
  primary: "text-primary",
  muted: "text-muted-foreground",
};

export function LoadingSpinner({
  className,
  size = "md",
  variant = "default",
  label = "Loading...",
  ...props
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn("inline-flex items-center justify-center", className)}
      role="status"
      aria-live="polite"
      {...props}
    >
      <svg
        className={cn("animate-spin", sizeClasses[size], variantClasses[variant])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function LoadingOverlay({
  className,
  label = "Loading...",
  size = "lg",
  ...props
}: Omit<LoadingSpinnerProps, "variant"> & { variant?: "default" | "primary" | "muted" }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
        className
      )}
      role="status"
      aria-live="polite"
      {...props}
    >
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6 shadow-lg">
        <LoadingSpinner size={size} label={label} />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function LoadingButton({
  children,
  isLoading,
  className,
  spinnerSize = "sm",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean; spinnerSize?: "sm" | "md" }) {
  return (
    <button
      className={cn("relative inline-flex items-center justify-center gap-2", className)}
      disabled={isLoading || props.disabled}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && <LoadingSpinner size={spinnerSize} label="" />}
      <span className={cn(isLoading ? "opacity-0" : "opacity-100")}>{children}</span>
    </button>
  );
}