"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderKanban, Building2, Users, LayoutDashboard } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProposalCardProps {
  proposal: {
    id: string;
    type: "division" | "role" | "room";
    status: "pending" | "approved" | "rejected";
    payload: any;
    triggerProjectId: string | null;
    triggerProject?: { id: string; title: string } | null;
    createdAt: string | Date;
    updatedAt: string | Date;
  };
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onView?: (id: string) => void;
}

const TYPE_ICONS = {
  division: Building2,
  role: Users,
  room: LayoutDashboard,
};

const TYPE_LABELS = {
  division: "New Division",
  role: "New Role",
  room: "New Room",
};

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default function ProposalCard({
  proposal,
  onApprove,
  onReject,
  onView,
}: ProposalCardProps) {
  const TypeIcon = TYPE_ICONS[proposal.type];
  const timeAgo = formatDistanceToNow(new Date(proposal.createdAt), { addSuffix: true });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <TypeIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-medium truncate">
                  {proposal.payload.name || proposal.payload.title || "Untitled"}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {TYPE_LABELS[proposal.type]}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-1 line-clamp-1">
                {proposal.payload.description || proposal.payload.reason || "No description"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={STATUS_COLORS[proposal.status]} variant="default">
              {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>Created {timeAgo}</span>
          {proposal.triggerProject?.title && (
            <span className="flex items-center gap-1">
              <FolderKanban className="h-3 w-3" />
              {proposal.triggerProject.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {proposal.status === "pending" && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => onApprove?.(proposal.id)}
                className="flex-1"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject?.(proposal.id)}
                className="flex-1"
              >
                Reject
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onView?.(proposal.id)}
            className="flex-1"
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}