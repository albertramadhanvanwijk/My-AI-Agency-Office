"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Error - My AI Agency Office</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            An unexpected error occurred. The team has been notified. Please try refreshing the page.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={reset} className="gap-2" size="lg">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh Page
            </Button>
            <Link href="/" className="text-primary hover:underline text-center">
              <Home className="h-4 w-4 inline mr-1" aria-hidden="true" />
              Go to Home
            </Link>
          </div>
          {process.env.NODE_ENV === "development" && (
            <details className="mt-6 text-left text-xs text-muted-foreground">
              <summary className="cursor-pointer mb-1">Error Details (Development)</summary>
              <pre className="bg-muted p-3 rounded overflow-auto text-left whitespace-pre-wrap">
                {error.message}
                {error.digest && `\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
        </div>
      </body>
    </html>
  );
}