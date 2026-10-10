"use client";

import { Button } from "@/components/ui/button";
import { CircleCheck, Loader2 } from "lucide-react";
import { useState } from "react";

interface ApproveButtonProps {
  proposalId: string;
  onApprove: (id: string) => Promise<void>;
  onMigrate?: (id: string) => Promise<void>;
  variant?: "approve" | "migrate";
  disabled?: boolean;
  className?: string;
}

export default function ApproveButton({
  proposalId,
  onApprove,
  onMigrate,
  variant = "approve",
  disabled = false,
  className,
}: ApproveButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || loading) return;
    setLoading(true);
    try {
      if (variant === "migrate" && onMigrate) {
        await onMigrate(proposalId);
      } else {
        await onApprove(proposalId);
      }
    } finally {
      setLoading(false);
    }
  };

  if (variant === "migrate") {
    return (
      <Button
        onClick={handleClick}
        disabled={disabled || loading}
        className={className}
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Migrating...
          </>
        ) : (
          <>
            <CircleCheck className="h-4 w-4" />
            Migrate Division
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || loading}
      className={className}
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Approving...
        </>
      ) : (
        <>
          <CircleCheck className="h-4 w-4" />
          Approve
        </>
      )}
    </Button>
  );
}