"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Search,
  HelpCircle,
  Plus,
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  FileText,
  Layers,
  Settings,
  Zap,
  ListChecks,
  DoorOpen,
  Building2,
  Handshake,
  Keyboard,
  Command,
  X,
  ChevronDown,
} from "lucide-react";

interface Shortcut {
  key: string;
  description: string;
  category: string;
  action?: () => void;
}

const SHORTCUTS: Shortcut[] = [
  { key: "⌘ K", description: "Global Search", category: "Navigation", action: () => {} },
  { key: "⌘ ⇧ P", description: "Command Palette", category: "Navigation", action: () => {} },
  { key: "?", description: "Show Help", category: "Navigation", action: () => {} },
  { key: "⌘ N", description: "New Project", category: "Actions", action: () => {} },
  { key: "⌘ ⇧ N", description: "New Task", category: "Actions", action: () => {} },
  { key: "⌘ B", description: "Toggle Sidebar", category: "Layout", action: () => {} },
  { key: "1", description: "Go to Lobby", category: "Go To", action: () => {} },
  { key: "2", description: "Go to Dashboard", category: "Go To", action: () => {} },
  { key: "3", description: "Go to Projects", category: "Go To", action: () => {} },
  { key: "4", description: "Go to Chat", category: "Go To", action: () => {} },
  { key: "5", description: "Go to Proposals", category: "Go To", action: () => {} },
  { key: "6", description: "Go to Organization", category: "Go To", action: () => {} },
  { key: "G L", description: "Go to Lobby", category: "Go To (Vim-style)", action: () => {} },
  { key: "G D", description: "Go to Dashboard", category: "Go To (Vim-style)", action: () => {} },
  { key: "G P", description: "Go to Projects", category: "Go To (Vim-style)", action: () => {} },
  { key: "G C", description: "Go to Chat", category: "Go To (Vim-style)", action: () => {} },
  { key: "Esc", description: "Close Modal / Clear Search", category: "General", action: () => {} },
];

function KeyCap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd className={cn("inline-flex items-center justify-center px-2 py-1 text-xs font-mono font-medium bg-muted rounded border", className)}>
      {children}
    </kbd>
  );
}

function formatKey(key: string): React.ReactNode {
  return key
    .split(" ")
    .map((part, i) => (
      <React.Fragment key={i}>
        {i > 0 && <span className="px-1 text-muted-foreground">+</span>}
        <KeyCap>{part}</KeyCap>
      </React.Fragment>
    ));
}

export function KeyboardShortcuts() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        // But still allow Escape to close modals
        if (e.key === "Escape") {
          setIsHelpOpen(false);
          setIsSearchOpen(false);
        }
        return;
      }

      // Cmd/Ctrl + K - Global Search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
        return;
      }

      // Shift + ? - Help
      if (e.shiftKey && e.key === "?") {
        e.preventDefault();
        setIsHelpOpen(true);
        return;
      }

      // Escape - Close modals
      if (e.key === "Escape") {
        setIsHelpOpen(false);
        setIsSearchOpen(false);
        setSearchQuery("");
        return;
      }

      // Number keys 1-6 for navigation
      if (e.key >= "1" && e.key <= "6") {
        const routes = ["/lobby", "/dashboard", "/projects", "/chat", "/proposals", "/organization"];
        const route = routes[parseInt(e.key) - 1];
        if (route) {
          window.location.href = route;
        }
      }

      // Vim-style: G then letter
      // Note: This would need more complex state management for sequences
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const filteredShortcuts = SHORTCUTS.filter(
    (s) =>
      s.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedShortcuts = filteredShortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) acc[shortcut.category] = [];
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <>
      {/* Help Trigger Button */}
      <Button
        data-testid="shortcuts-help-trigger"
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsHelpOpen(true)}
        aria-label="Keyboard shortcuts (Shift+?)"
      >
        <HelpCircle className="h-4 w-4" />
        <span className="sr-only">Keyboard shortcuts</span>
        <kbd className="absolute -top-1 -right-1 hidden xs:block text-[10px] px-1 bg-muted rounded">
          ⇧?
        </kbd>
      </Button>

      {/* Global Search Dialog */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="max-w-2xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Global Search
            </DialogTitle>
            <DialogDescription>
              Search projects, staff, invoices, and more. Press <KeyCap>Esc</KeyCap> to close.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              ref={searchInputRef}
              data-testid="global-search-input"
              placeholder="Search projects, staff, invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-lg"
              autoFocus
            />
            <Separator />
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {/* Search results would go here - placeholder for now */}
              <div className="text-center text-muted-foreground py-8">
                <p>Search results will appear here</p>
                <p className="text-sm">Connect to your search API to enable full-text search</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Modal */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]" data-testid="shortcuts-help-modal">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Keyboard className="h-5 w-5" />
                  Keyboard Shortcuts
                </DialogTitle>
                <DialogDescription>
                  Boost your productivity with these keyboard shortcuts
                </DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsHelpOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
            {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
              <div key={category} className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  {category}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span className="text-sm font-medium">{shortcut.description}</span>
                      <span className="flex items-center gap-1">{formatKey(shortcut.key)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Provider component to wrap the app
export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <KeyboardShortcuts />
    </>
  );
}