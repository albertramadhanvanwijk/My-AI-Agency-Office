"use client";

import { useRef, useEffect } from "react";
import Sidebar, { type DivisionNavItem } from "@/components/layout/Sidebar";
import Header, { type HeaderUser } from "@/components/layout/Header";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useMobileDrawer, useSwipeableDrawer } from "@/hooks/useMobileDrawer";

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
  const {
    isOpen,
    open,
    close,
    drawerRef,
    backdropRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleKeyDown,
  } = useMobileDrawer({
    enableSwipe: true,
    enableBackdropClick: true,
    trapFocus: true,
    swipeThreshold: 100,
  });

  const { style: swipeStyle, handleTouchStart: handleSwipeStart, handleTouchMove: handleSwipeMove, handleTouchEnd: handleSwipeEnd } = useSwipeableDrawer(
    isOpen,
    close,
    { threshold: 120, direction: "left" }
  );

  // Combined touch handlers
  const combinedTouchStart = (e: React.TouchEvent) => {
    handleTouchStart(e);
    handleSwipeStart(e);
  };

  const combinedTouchMove = (e: React.TouchEvent) => {
    handleTouchMove(e);
    handleSwipeMove(e);
  };

  const combinedTouchEnd = () => {
    handleTouchEnd();
    handleSwipeEnd();
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        user={user}
        onlineCount={onlineCount}
        activeProjectsCount={activeProjectsCount}
        onMenuClick={open}
      />

      {/* Backdrop */}
      <Sheet open={isOpen} onOpenChange={open}>
        <SheetContent side="left" onClose={close} className="p-0">
          {/* Drawer content with swipe gestures */}
          <div
            ref={drawerRef}
            onTouchStart={combinedTouchStart}
            onTouchMove={combinedTouchMove}
            onTouchEnd={combinedTouchEnd}
            onKeyDown={handleKeyDown}
            className={cn("h-full overflow-y-auto touch-none", swipeStyle.transform && "transition-transform duration-200")}
            style={swipeStyle}
          >
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