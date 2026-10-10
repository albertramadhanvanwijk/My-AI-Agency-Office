"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  Users,
  FileText,
  MessageSquare,
  FolderKanban,
  Search,
  Trash2,
  Calendar,
  CreditCard,
  Settings,
  LayoutDashboard,
  Building2,
  Mail,
  Bell,
  HelpCircle,
  Plus,
  ArrowRight,
} from "lucide-react";

interface EmptyStateProps {
  icon?: keyof typeof icons | React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  };
  className?: string;
  illustration?: React.ReactNode;
}

const icons = {
  inbox: Inbox,
  users: Users,
  file: FileText,
  chat: MessageSquare,
  project: FolderKanban,
  search: Search,
  trash: Trash2,
  calendar: Calendar,
  invoice: CreditCard,
  settings: Settings,
  dashboard: LayoutDashboard,
  building: Building2,
  mail: Mail,
  bell: Bell,
  help: HelpCircle,
  plus: Plus,
} as const;

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
  illustration,
}: EmptyStateProps) {
  const IconComponent = typeof icon === "string" ? icons[icon as keyof typeof icons] : null;

  return (
    <div
      data-testid="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border bg-card p-8 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {illustration ? (
        <div className="text-muted-foreground/50" aria-hidden="true">
          {illustration}
        </div>
      ) : IconComponent ? (
        <IconComponent className="h-16 w-16 text-muted-foreground/50" aria-hidden="true" />
      ) : null}

      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        )}
      </div>

      {action && (
        <Button
          variant={action.variant ?? "default"}
          size="default"
          onClick={action.onClick}
          className="gap-2"
        >
          {action.label}
          {action.variant !== "ghost" && action.variant !== "link" && (
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      )}
    </div>
  );
}

export function EmptyStateCard({
  icon = "inbox",
  title,
  description,
  action,
  className,
}: EmptyStateProps & { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card shadow-sm", className)}>
      <div className="p-8">
        <EmptyState icon={icon} title={title} description={description} action={action} />
      </div>
    </div>
  );
}

export const EmptyStatePresets = {
  noProjects: (onCreate: () => void) => (
    <EmptyState
      icon="project"
      title="No projects yet"
      description="Create your first project to start managing work in the office."
      action={{ label: "Create Project", onClick: onCreate }}
    />
  ),
  noStaff: (onAdd: () => void) => (
    <EmptyState
      icon="users"
      title="No active staff"
      description="All staff are currently on standby. Activate staff from the Organization page."
      action={{ label: "Manage Staff", onClick: onAdd, variant: "outline" }}
    />
  ),
  noInvoices: () => (
    <EmptyState
      icon="invoice"
      title="No invoices"
      description="Invoices will appear here when projects are completed and billed."
    />
  ),
  noMessages: () => (
    <EmptyState
      icon="chat"
      title="No messages"
      description="Start a conversation with your team or clients."
    />
  ),
  noSearchResults: (query: string) => (
    <EmptyState
      icon="search"
      title="No results found"
      description={`No matches for "${query}". Try adjusting your search terms.`}
    />
  ),
  noTasks: () => (
    <EmptyState
      icon="file"
      title="No tasks"
      description="Tasks will appear here when work is assigned."
    />
  ),
  noProposals: () => (
    <EmptyState
      icon="help"
      title="No proposals"
      description="Proposals for new divisions or roles will appear here."
    />
  ),
  noClients: (onAdd: () => void) => (
    <EmptyState
      icon="building"
      title="No clients"
      description="Invite clients to start working with them."
      action={{ label: "Invite Client", onClick: onAdd }}
    />
  ),
  noNotifications: () => (
    <EmptyState
      icon="bell"
      title="No notifications"
      description="You're all caught up! New notifications will appear here."
    />
  ),
  error: (onRetry: () => void, message?: string) => (
    <EmptyState
      icon="trash"
      title="Something went wrong"
      description={message ?? "Unable to load data. Please try again."}
      action={{ label: "Retry", onClick: onRetry, variant: "outline" }}
    />
  ),
};