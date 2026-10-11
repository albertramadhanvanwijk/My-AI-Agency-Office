import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const SENSITIVE_TOKENS = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CLIENT_ID",
  "NINE_ROUTER_API_KEY",
  "NINE_ROUTER_BASE_URL",
];

function sanitizeDbError(msg: string): string {
  let out = msg.slice(0, 200);
  for (const tok of SENSITIVE_TOKENS) {
    // avoid leaking env var names that may appear in Prisma validation errors
    if (out.includes(tok)) {
      return "database unavailable";
    }
  }
  // Strip postgres:// / postgresql:// fragments that may leak host
  out = out.replace(/postgres(?:ql)?:\/\/\S*/gi, "[redacted]");
  return out;
}

function getVersion(): string {
  try {
    const pkgPath = join(process.cwd(), "package.json");
    const raw = readFileSync(pkgPath, "utf8");
    const parsed = JSON.parse(raw) as { version?: string };
    if (typeof parsed.version === "string" && parsed.version.trim().length > 0) {
      return parsed.version;
    }
  } catch {
    // ignore — fall through to env fallback
  }
  return process.env.npm_package_version ?? "0.1.0";
}

async function checkDb(): Promise<{ db: "ok" | "fail"; dbLatencyMs: number; dbError?: string }> {
  const start = Date.now();
  try {
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("db ping timeout after 2s")), 2_000).unref?.();
      // fallback for environments without unref
      // ensure timer does not keep process alive
    });

    // Prisma ping — SELECT 1 . Use tagged template so it works with real client and mocked client.
    await Promise.race([db.$queryRaw`SELECT 1`, timeout]);

    return { db: "ok", dbLatencyMs: Date.now() - start };
  } catch (e: unknown) {
    const raw = e instanceof Error ? e.message : String(e);
    // Avoid leaking env names / connection fragments — sanitize before returning
    const sanitized = sanitizeDbError(raw);
    return { db: "fail", dbLatencyMs: Date.now() - start, dbError: sanitized };
  }
}

export async function GET() {
  try {
    const ts = new Date().toISOString();
    const uptime = typeof process.uptime === "function" ? Number(process.uptime().toFixed(2)) : 0;
    const version = getVersion();

    const dbResult = await checkDb();

    const payload: Record<string, unknown> = {
      status: "ok",
      ts,
      uptime,
      version,
      db: dbResult.db,
      dbLatencyMs: dbResult.dbLatencyMs,
    };

    if (dbResult.dbError) {
      payload.dbError = dbResult.dbError;
    }

    // Never expose sensitive env values — only non-sensitive runtime hint
    payload.env = process.env.NODE_ENV ?? "development";

    return NextResponse.json(payload, {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e: unknown) {
    // Absolute fallback — health must respond 200 even on unexpected error (local-first)
    const raw = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        status: "ok",
        ts: new Date().toISOString(),
        uptime: typeof process.uptime === "function" ? Number(process.uptime().toFixed(2)) : 0,
        version: getVersion(),
        db: "fail" as const,
        dbError: sanitizeDbError(raw),
        env: process.env.NODE_ENV ?? "development",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }
}
