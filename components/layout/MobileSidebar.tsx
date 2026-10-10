"use client";

import { useState } from "react";
import Sidebar, { type DivisionNavItem } from "@/components/layout/Sidebar";
import Header, { type HeaderUser } from "@/components/layout/Header";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type Props = {
  divisions?: DivisionNavItem[];
  user?: HeaderUser | null;
  onlineCount?: number;
  activeProjectsCount?: number;
  children: React.ReactNode;
};

export default function MobileSidebarShell({
  divisions,
  user,
  onlineCount,
  activeProjectsCount,
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        user={user}
        onlineCount={onlineCount}
        activeProjectsCount={activeProjectsCount}
        onMenuClick={() => setOpen(true)}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" onClose={() => setOpen(false)} className="p-0">
          {/* Reuse Sidebar nav but without its outer border/width wrapper */}
          <div className="h-full overflow-y-auto">
            <Sidebar divisions={divisions} className="w-full border-r-0" />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1">
        <div className="hidden md:flex">
          <Sidebar divisions={divisions} />
        </div>
        <main className="min-w-0 flex-1 bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
