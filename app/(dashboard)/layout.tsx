import { redirect } from "next/navigation";
import { getHeaderUser } from "@/lib/header-user";
import { db } from "@/lib/db";
import Sidebar, { DIVISION_NAV_FALLBACK, type DivisionNavItem } from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import MobileSidebarShell from "@/components/layout/MobileSidebar";

export const dynamic = "force-dynamic";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function divisionToNav(d: { name: string; color: string; icon: string }): DivisionNavItem {
  const slug = toSlug(d.name);
  // Map known names to canonical hrefs; fallback to /divisions/[slug]
  const canonical: Record<string, string> = {
    "strategy-and-planning": "/divisions/strategy",
    "creative-and-content": "/divisions/creative",
    "technology-and-product": "/divisions/technology",
    "marketing-and-growth": "/divisions/marketing",
    "client-relations": "/divisions/client-relations",
    "finance-legal-and-admin": "/divisions/finance",
  };
  return {
    name: d.name,
    slug,
    href: canonical[slug] ?? `/divisions/${slug}`,
    icon: d.icon,
    color: d.color,
  };
}

async function getDivisions(): Promise<DivisionNavItem[]> {
  try {
    const rows = await db.division.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: { name: true, color: true, icon: true },
    });
    if (!rows.length) return DIVISION_NAV_FALLBACK;
    return rows.map(divisionToNav);
  } catch {
    return DIVISION_NAV_FALLBACK;
  }
}

async function getPresenceCounts(): Promise<{ onlineCount: number; activeProjectsCount: number }> {
  // Stubs for now; Task 7 will wire real presence.
  // Try to read real active staff count when DB is available.
  try {
    const onlineCount = await db.staff.count({ where: { status: "active" } });
    const activeProjectsCount = await db.project.count({
      where: { status: { in: ["PLANNING", "EXECUTION", "QA"] } },
    });
    return {
      onlineCount: onlineCount || 3,
      activeProjectsCount,
    };
  } catch {
    return { onlineCount: 3, activeProjectsCount: 0 };
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [divisions, counts, user] = await Promise.all([
    getDivisions(),
    getPresenceCounts(),
    getHeaderUser(),
  ]);

  if (!user) {
    redirect("/login");
  }

  // Mobile + desktop app shell: Header top, Sidebar left on desktop, drawer on mobile.
  // Use MobileSidebarShell client wrapper for responsive drawer state.
  return (
    <MobileSidebarShell divisions={divisions} user={user} onlineCount={counts.onlineCount} activeProjectsCount={counts.activeProjectsCount}>
      <div className="p-4 md:p-6">{children}</div>
    </MobileSidebarShell>
  );
}
