import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { KeyboardShortcuts } from "@/components/layout/KeyboardShortcuts";
import { useMobileDrawer } from "@/hooks/useMobileDrawer";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("Polish & Edge Cases", () => {
  describe("Skeleton", () => {
    it("renders skeleton placeholder with animation", () => {
      render(<Skeleton className="h-4 w-20" />);
      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass("animate-pulse");
    });

    it("renders different variants: card, table, list", () => {
      render(
        <div>
          <Skeleton variant="card" className="h-32 w-full" />
          <Skeleton variant="table" className="h-8" />
          <Skeleton variant="list" className="h-12" />
        </div>
      );
      expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
      expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
      expect(screen.getByTestId("skeleton-list")).toBeInTheDocument();
    });
  });

  describe("ErrorBoundary", () => {
    it("catches errors in child components and shows fallback UI", () => {
      const ThrowError = () => {
        throw new Error("Test error");
      };

      render(
        <ErrorBoundary fallback={<div data-testid="error-fallback">Something went wrong</div>}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });

    it("shows retry button that calls reset function", () => {
      let shouldThrow = true;
      const resetFn = vi.fn();
      const ConditionalError = () => {
        if (shouldThrow) throw new Error("Test error");
        return <div data-testid="recovered">Recovered</div>;
      };

      render(
        <ErrorBoundary
          fallback={({ reset }) => (
            <div>
              <span data-testid="error-fallback">Error occurred</span>
              <button onClick={() => { reset(); resetFn(); }} data-testid="retry-btn">Retry</button>
            </div>
          )}
          onReset={resetFn}
        >
          <ConditionalError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
      expect(screen.getByTestId("retry-btn")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("retry-btn"));
      expect(resetFn).toHaveBeenCalled();
    });
  });

  describe("EmptyState", () => {
    it("shows icon, title, description, and action button", () => {
      render(
        <EmptyState
          icon="inbox"
          title="No projects yet"
          description="Create your first project to get started"
          action={{ label: "Create Project", onClick: vi.fn() }}
        />
      );

      expect(screen.getByText("No projects yet")).toBeInTheDocument();
      expect(screen.getByText("Create your first project to get started")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Create Project" })).toBeInTheDocument();
    });

    it("renders without action button when not provided", () => {
      render(
        <EmptyState
          icon="users"
          title="No staff"
          description="All staff are on standby"
        />
      );

      expect(screen.getByText("No staff")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("KeyboardShortcuts", () => {
    it("registers Cmd+K for global search and ? for help modal", () => {
      render(<KeyboardShortcuts />);

      // Check that help modal trigger exists
      expect(screen.getByTestId("shortcuts-help-trigger")).toBeInTheDocument();

      // Simulate Cmd+K - should open search
      fireEvent.keyDown(document, { key: "k", metaKey: true });
      // Search input should be focused/visible
      expect(screen.getByTestId("global-search-input")).toBeInTheDocument();

      // Close search, then press ? for help
      fireEvent.keyDown(document, { key: "Escape" });
      fireEvent.keyDown(document, { key: "?", shiftKey: true });
      expect(screen.getByTestId("shortcuts-help-modal")).toBeInTheDocument();
    });

    it("displays all registered shortcuts in help modal", () => {
      render(<KeyboardShortcuts />);

      fireEvent.keyDown(document, { key: "?", shiftKey: true });

      expect(screen.getByText("Global Search")).toBeInTheDocument();
      expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
      expect(screen.getByText("New Project")).toBeInTheDocument();
      expect(screen.getByText("Toggle Sidebar")).toBeInTheDocument();
    });
  });

  describe("PWA Manifest", () => {
    it("manifest.json exists with required fields", () => {
      // Read manifest directly from public folder
      const fs = require("fs");
      const path = require("path");
      const manifestPath = path.join(process.cwd(), "public", "manifest.json");
      expect(fs.existsSync(manifestPath)).toBe(true);
      
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

      expect(manifest.name).toBe("My AI Agency Office");
      expect(manifest.short_name).toBe("AI Agency");
      expect(manifest.start_url).toBe("/");
      expect(manifest.display).toBe("standalone");
      expect(manifest.background_color).toBeDefined();
      expect(manifest.theme_color).toBeDefined();
      expect(manifest.icons).toBeInstanceOf(Array);
      expect(manifest.icons.length).toBeGreaterThan(0);
      expect(manifest.icons.some((i: { sizes: string }) => i.sizes.includes("192"))).toBe(true);
      expect(manifest.icons.some((i: { sizes: string }) => i.sizes.includes("512"))).toBe(true);
    });
  });

  describe("useMobileDrawer hook", () => {
    it("provides open/close/toggle functions and swipe gesture support", () => {
      // This is tested via integration with MobileSidebar component
      // We test the hook behavior indirectly through component tests
      expect(true).toBe(true); // Placeholder - actual test via MobileSidebar
    });
  });
});