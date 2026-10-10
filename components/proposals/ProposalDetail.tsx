"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Users,
  LayoutDashboard,
  CircleCheck,
  CircleX,
  Clock,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";

interface ProposalDetailProps {
  proposal: {
    id: string;
    type: "division" | "role" | "room";
    status: "pending" | "approved" | "rejected";
    payload: any;
    triggerProjectId: string | null;
    triggerProject?: { id: string; title: string; status: string } | null;
    createdAt: string | Date;
    updatedAt: string | Date;
  };
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onMigrate?: (id: string) => void;
  onBack: () => void;
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

const STATUS_CONFIG = {
  pending: { label: "Pending Review", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CircleCheck },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: CircleX },
};

export default function ProposalDetail({
  proposal,
  onApprove,
  onReject,
  onMigrate,
  onBack,
}: ProposalDetailProps) {
  const TypeIcon = TYPE_ICONS[proposal.type];
  const statusConfig = STATUS_CONFIG[proposal.status];

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
        <ArrowLeft className="h-4 w-4" />
        Back to Proposals
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <TypeIcon className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{proposal.payload.name || proposal.payload.title || "Untitled"}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{TYPE_LABELS[proposal.type]}</Badge>
              <Badge className={statusConfig.color}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proposal Details</CardTitle>
          <CardDescription>Review the proposal details before taking action.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Type</label>
              <p className="text-sm">{TYPE_LABELS[proposal.type]}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Badge className={statusConfig.color} variant="default">
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Created</label>
              <p className="text-sm">{format(new Date(proposal.createdAt), "PPpp")}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Updated</label>
              <p className="text-sm">{format(new Date(proposal.updatedAt), "PPpp")}</p>
            </div>
            {proposal.triggerProject && (
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Trigger Project</label>
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{proposal.triggerProject.title}</span>
                  <Badge variant="outline">{proposal.triggerProject.status}</Badge>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <p className="text-sm mt-1 whitespace-pre-wrap">
              {proposal.payload.description || proposal.payload.reason || "No description provided."}
            </p>
          </div>

          <Separator />

          <div>
            <label className="text-xs font-medium text-muted-foreground">Full Payload</label>
            <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto max-h-64">
              {JSON.stringify(proposal.payload, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {proposal.status === "pending" && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <CircleX className="h-5 w-5" />
              Actions Required
            </CardTitle>
            <CardDescription>This proposal is pending your decision as the Owner.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="destructive"
              size="lg"
              onClick={() => onReject(proposal.id)}
              className="flex-1 gap-2"
            >
              <CircleX className="h-4 w-4" />
              Reject Proposal
            </Button>
            <Button variant="default" size="lg" onClick={() => onApprove(proposal.id)} className="flex-1 gap-2">
              <CircleCheck className="h-4 w-4" />
              Approve Proposal
            </Button>
          </CardContent>
        </Card>
      )}

      {proposal.status === "approved" && proposal.type === "division" && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CircleCheck className="h-5 w-5" />
              Ready for Migration
            </CardTitle>
            <CardDescription>
              This division proposal has been approved. Click &ldquo;Migrate&rdquo; to activate the division,
              create default room & roles, and link to the triggering project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="default"
              size="lg"
              onClick={() => onMigrate?.(proposal.id)}
              className="w-full gap-2"
            >
              <Building2 className="h-4 w-4" />
              Migrate Provisional Division
            </Button>
          </CardContent>
        </Card>
      )}

      {proposal.status === "rejected" && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <CircleX className="h-5 w-5" />
              Proposal Rejected
            </CardTitle>
            <CardDescription>This proposal was rejected and cannot be migrated.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {proposal.status === "approved" && proposal.type !== "division" && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CircleCheck className="h-5 w-5" />
              Approved
            </CardTitle>
            <CardDescription>
              This {proposal.type} proposal has been approved. Implementation will follow based on the proposal type.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}