"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  DoorOpen,
  FolderKanban,
  MessageSquare,
  Building2,
  Compass,
  Palette,
  Code2,
  TrendingUp,
  Handshake,
  Scale,
  Layers,
} from "lucide-react";

export type DivisionNavItem = {
  name: string;
  slug: string;
  href: string;
  icon: string;
  color: string;
};

// Hardcoded fallback per spec §4/§6 (same as prisma/seed.ts DIVISIONS)
export const DIVISION_NAV_FALLBACK: DivisionNavItem[] = [
  { name: "Strategy & Planning", slug: "strategy", href: "/divisions/strategy", icon: "compass", color: "#dbeafe" },
  { name: "Creative & Content", slug: "creative", href: "/divisions/creative", icon: "palette", color: "#fce7f3" },
  { name: "Technology & Product", slug: "technology", href: "/divisions/technology", icon: "code-2", color: "#dcfce7" },
  { name: "Marketing & Growth", slug: "marketing", href: "/divisions/marketing", icon: "trending-up", color: "#ffedd5" },
  { name: "Client Relations", slug: "client-relations", href: "/divisions/client-relations", icon: "handshake", color: "#ede9fe" },
  { name: "Finance, Legal & Admin", slug: "finance", href: "/divisions/finance", icon: "scale", color: "#fef3c7" },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  compass: Compass,
  palette: Palette,
  "code-2": Code2,
  "trending-up": TrendingUp,
  handshake: Handshake,
  scale: Scale,
};

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

type SidebarProps = {
  divisions?: DivisionNavItem[];
  className?: string;
};

export default function Sidebar({ divisions, className }: SidebarProps) {
  const pathname = usePathname();
  const items = divisions ?? DIVISION_NAV_FALLBACK;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r bg-card",
        className
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Building2 className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold">Office</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Main
        </p>
        <NavLink href="/lobby" active={isActive("/lobby")}>
          <DoorOpen className="h-4 w-4 shrink-0" /> Lobby
        </NavLink>
        <NavLink href="/dashboard" active={pathname === "/dashboard"}>
          <LayoutDashboard className="h-4 w-4 shrink-0" /> Dashboard
        </NavLink>
        <NavLink href="/projects" active={isActive("/projects")}>
          <FolderKanban className="h-4 w-4 shrink-0" /> Projects
        </NavLink>
        <NavLink href="/chat" active={isActive("/chat")}>
          <MessageSquare className="h-4 w-4 shrink-0" /> Chat
        </NavLink>
        <NavLink href="/organization" active={isActive("/organization")}>
          <Layers className="h-4 w-4 shrink-0" /> Organization
        </NavLink>

        <Separator className="my-3" />

        <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Divisions
        </p>
        <div data-testid="divisions-nav">
          {items.map((d) => {
            const Icon = ICON_MAP[d.icon] ?? Layers;
            return (
              <NavLink key={d.slug} href={d.href} active={isActive(d.href)}>
                <span
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
                  style={{ backgroundColor: d.color }}
                  aria-hidden="true"
                >
                  <Icon className="h-3.5 w-3.5 opacity-80" />
                </span>
                <span className="truncate">{d.name}</span>
              </NavLink>
            );
          })}
        </div>

        <Separator className="my-3" />

        <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Portal
        </p>
        <NavLink href="/portal" active={isActive("/portal")}>
          <Handshake className="h-4 w-4 shrink-0" /> Client Portal
        </NavLink>
      </nav>

      <div className="border-t p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">My AI Agency Office</p>
        <p>Cozy Creative · Isometric</p>
      </div>
    </aside>
  );
}
