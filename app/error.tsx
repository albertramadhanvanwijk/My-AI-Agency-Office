"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  React.useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-8 w-8" aria-hidden="true" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
        <p className="text-muted-foreground max-w-md">
          We encountered an error loading this page. Please try again.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={reset} className="gap-2" size="lg">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try Again
        </Button>
        <Link href="/lobby" className="btn-outline gap-2 flex items-center justify-center px-4 py-2">
          <Home className="h-4 w-4" aria-hidden="true" />
          Go to Lobby
        </Link>
      </div>
      {process.env.NODE_ENV === "development" && (
        <details className="text-left text-xs text-muted-foreground max-w-md w-full">
          <summary className="cursor-pointer mb-1">Error Details (Development)</summary>
          <pre className="bg-muted p-3 rounded overflow-auto text-left whitespace-pre-wrap">
            {error.message}
            {error.digest && `\nDigest: ${error.digest}`}
          </pre>
        </details>
      )}
    </div>
  );
}