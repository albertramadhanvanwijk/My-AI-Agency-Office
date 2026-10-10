import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Edge-safe: do NOT import prisma/lib/db here

const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/api/health",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p));
}

// Security headers
const securityHeaders = {
  "X-DNS-Prefetch-Control": "on",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

// CSP header - restrictive but allows needed resources
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https:;
  connect-src 'self' https://api.9router.com wss: https://*.supabase.co;
  frame-src 'self' https://accounts.google.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
`.replace(/\s+/g, " ").trim();

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Create response early to add headers
  const res = NextResponse.next();

  // Add security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    res.headers.set(key, value);
  });

  // Add CSP header (skip for API routes to avoid issues)
  if (!pathname.startsWith("/api/")) {
    res.headers.set("Content-Security-Policy", cspHeader);
  }

  // Add rate limit headers (placeholder - actual limiting in API routes)
  res.headers.set("X-RateLimit-Limit", "100");
  res.headers.set("X-RateLimit-Remaining", "99");
  res.headers.set("X-RateLimit-Reset", Math.ceil(Date.now() / 1000 + 60).toString());

  if (isPublicPath(pathname)) {
    return res;
  }

  // Allow static assets
  if (pathname.startsWith("/_next") || pathname.includes(".")) {
    const isProtectedPrefix =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/portal") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/lobby") ||
      pathname.startsWith("/projects") ||
      pathname.startsWith("/chat") ||
      pathname.startsWith("/organization") ||
      pathname.startsWith("/divisions");
    if (!isProtectedPrefix) return res;
  }

  const isProtectedDashboard =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/lobby") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/chat") ||
    pathname.startsWith("/organization") ||
    pathname.startsWith("/divisions");
  const isPortal = pathname.startsWith("/portal");
  const isApi = pathname.startsWith("/api/");

  // Unprotected routes that are not dashboard/portal/api — allow through (e.g., /)
  if (!isProtectedDashboard && !isPortal && !isApi) {
    return res;
  }

  let token: { role?: string; email?: string | null; sub?: string } | null = null;
  try {
    token = (await getToken({
      req: req as unknown as Parameters<typeof getToken>[0]["req"],
      secret: process.env.NEXTAUTH_SECRET,
    })) as { role?: string; email?: string | null; sub?: string } | null;
  } catch {
    token = null;
  }

  // API: return 401 JSON rather than redirect
  if (isApi) {
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Add user info headers for API routes
    res.headers.set("X-User-Role", token.role ?? "unknown");
    res.headers.set("X-User-ID", token.sub ?? "unknown");
    return res;
  }

  // Dashboard / Portal require session
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const role = (token as { role?: string } | null)?.role as string | undefined;

  // Add user role to headers for client components
  res.headers.set("X-User-Role", role ?? "unknown");

  if (isProtectedDashboard) {
    // OWNER only
    if (role !== "OWNER") {
      const target = new URL(role === "CLIENT" ? "/portal" : "/login", req.url);
      return NextResponse.redirect(target);
    }
    return res;
  }

  if (isPortal) {
    // CLIENT or OWNER allowed
    if (role !== "CLIENT" && role !== "OWNER") {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
    return res;
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/portal/:path*",
    "/api/:path*",
    "/lobby",
    "/lobby/:path*",
    "/projects",
    "/projects/:path*",
    "/chat",
    "/chat/:path*",
    "/organization",
    "/organization/:path*",
    "/divisions",
    "/divisions/:path*",
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-).*)",
  ],
};