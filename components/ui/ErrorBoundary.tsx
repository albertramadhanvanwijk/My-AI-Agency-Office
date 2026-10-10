"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode | ((props: { error: Error | null; reset: () => void }) => React.ReactNode);
  onError?: (error: Error) => void;
  onReset?: () => void;
}

interface ErrorFallbackProps {
  error: Error | null;
  reset: () => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({ error: this.state.error, reset: this.reset });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, reset }: ErrorFallbackProps) {
  return (
    <div
      data-testid="error-fallback"
      className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border bg-card p-6 text-center"
      role="alert"
    >
      <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error?.message ?? "An unexpected error occurred. Please try again."}
        </p>
      </div>
      <Button
        data-testid="retry-btn"
        variant="default"
        size="default"
        onClick={reset}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}