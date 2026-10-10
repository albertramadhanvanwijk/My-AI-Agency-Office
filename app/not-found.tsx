import Link from "next/link";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Search className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <h2 className="text-2xl font-semibold text-foreground">Page not found</h2>
        <p className="text-muted-foreground max-w-md">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/lobby"
          className="btn-primary gap-2 flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Back to Lobby
        </Link>
        <Link
          href="/"
          className="btn-outline gap-2 flex items-center justify-center px-6 py-3 rounded-lg border bg-transparent hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Go Home
        </Link>
      </div>
    </div>
  );
}