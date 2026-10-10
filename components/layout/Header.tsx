"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { LogOut, Menu, Building2, Users, FolderOpen } from "lucide-react";

export type HeaderUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "OWNER" | "CLIENT";
  id?: string;
};

type HeaderProps = {
  user?: HeaderUser | null;
  onlineCount?: number;
  activeProjectsCount?: number;
  onMenuClick?: () => void;
};

export default function Header({
  user,
  onlineCount = 3,
  activeProjectsCount = 0,
  onMenuClick,
}: HeaderProps) {
  return (
    <header
      data-testid="app-header"
      className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4"
    >
      {onMenuClick && (
        <button
          aria-label="Open menu"
          onClick={onMenuClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background hover:bg-muted md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-center gap-2">
        <Building2 className="hidden h-5 w-5 text-primary sm:block" />
        <h1 className="text-sm font-semibold tracking-tight sm:text-base">
          My AI Agency Office
        </h1>
      </div>

      <div className="ml-2 hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
        <span
          data-testid="online-count"
          className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-2.5 py-1"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          Online {onlineCount}
        </span>
        <span
          data-testid="active-projects-count"
          className="inline-flex items-center gap-1.5 rounded-full border bg-muted/60 px-2.5 py-1"
        >
          <FolderOpen className="h-3 w-3" />
          {activeProjectsCount} active
        </span>
      </div>

      {/* Mobile online dot */}
      <div className="flex items-center gap-1 sm:hidden">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
        <span data-testid="online-count-mobile" className="text-xs text-muted-foreground">
          {onlineCount}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <>
            <div className="hidden items-center gap-2 text-right sm:flex">
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">
                  {user.name || user.email || "User"}
                </span>
                {user.email && (
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                )}
              </div>
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name ?? "avatar"}
                  className="h-8 w-8 rounded-full border object-cover"
                />
              ) : (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <Badge variant={user.role === "OWNER" ? "default" : "secondary"} data-testid="role-badge">
              {user.role}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </>
        ) : (
          <>
            <Badge variant="outline" data-testid="role-badge">
              Guest
            </Badge>
          </>
        )}
      </div>
    </header>
  );
}

// Helper for server components — shape of session to header user
export function sessionToHeaderUser(
  session: { user?: { name?: string | null; email?: string | null; image?: string | null; role?: string; id?: string } } | null
): HeaderUser | null {
  if (!session?.user) return null;
  const role = session.user.role as "OWNER" | "CLIENT" | undefined;
  if (role !== "OWNER" && role !== "CLIENT") return null;
  return {
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    role,
    id: session.user.id,
  };
}
