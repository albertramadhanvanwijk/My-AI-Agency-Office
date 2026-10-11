/**
 * Quick MVP sanity checks — local-first verify
 * Checks: env presence, prisma generate, GET /api/health, DB counts (divisions>=6, staff==30)
 * Prints PASS/FAIL per check, exits 1 if any required check fails.
 * Run: npx tsx scripts/verify-mvp.ts
 */
import fs from "node:fs";
import path from "node:path";

// Load .env/.env.local for standalone runs (Next.js loads env automatically at runtime,
// but `npx tsx scripts/verify-mvp.ts` does not). Keep it tolerant — do not require dotenv dep.
(function loadDotEnv() {
  const candidates = [".env.local", ".env"];
  for (const file of candidates) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    try {
      const raw = fs.readFileSync(p, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        if (process.env[key] !== undefined) continue; // do not override shell env
        let val = trimmed.slice(eq + 1).trim();
        // unwrap quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
      // stop after first found file is enough, but allow .env to fill gaps if .env.local incomplete
      // so continue to next file only for missing keys (handled by guard above)
    } catch {
      // ignore
    }
  }
})();

type CheckResult = { name: string; status: "PASS" | "FAIL" | "WARN" | "SKIP"; detail?: string };

const results: CheckResult[] = [];

function push(name: string, status: CheckResult["status"], detail?: string): void {
  results.push({ name, status, detail });
  const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : status === "WARN" ? "!" : "-";
  const line = `[${icon}] ${status} — ${name}${detail ? `: ${detail}` : ""}`;
  if (status === "FAIL") console.error(line);
  else if (status === "WARN") console.warn(line);
  else console.log(line);
}

async function checkEnv(): Promise<void> {
  // Required for local-first run
  const required: string[] = ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET"];
  const optional: string[] = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "NINE_ROUTER_API_KEY", "NEXT_PUBLIC_APP_URL"];

  for (const key of required) {
    const val = process.env[key];
    if (val && String(val).trim().length > 0) {
      push(`env:${key}`, "PASS", "present");
    } else {
      push(`env:${key}`, "FAIL", "missing — set in .env / .env.local (see .env.example)");
    }
  }
  for (const key of optional) {
    const val = process.env[key];
    if (val && String(val).trim().length > 0) {
      push(`env:${key}`, "PASS", "present");
    } else {
      push(`env:${key}`, "WARN", "missing — optional for local smoke, required for publish");
    }
  }
}

async function checkPrismaGenerate(): Promise<void> {
  // 1) Check generated client exists on disk
  const prismaClientPath = path.join(process.cwd(), "node_modules", ".prisma", "client");
  const prismaPkgPath = path.join(process.cwd(), "node_modules", "@prisma", "client");
  const hasGenerated = fs.existsSync(prismaClientPath) || fs.existsSync(path.join(prismaPkgPath, "index.js")) || fs.existsSync(path.join(prismaPkgPath, "index.d.ts"));
  if (hasGenerated) {
    push("prisma:generate", "PASS", "client generated (node_modules/.prisma or @prisma/client present)");
  } else {
    push("prisma:generate", "FAIL", "not generated — run: npx prisma generate");
    return;
  }

  // 2) Try to instantiate PrismaClient (strict: proves schema compiles)
  try {
    const { PrismaClient } = await import("@prisma/client");
    const c = new PrismaClient();
    await c.$connect().catch(() => {
      // Connection failure is DB check, not generate check
    });
    await c.$disconnect().catch(() => {});
    push("prisma:client import", "PASS", "PrismaClient instantiates");
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : String(e);
    push("prisma:client import", "FAIL", msg);
  }
}

async function checkHealth(): Promise<void> {
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = base.replace(/\/$/, "") + "/api/health";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      const statusOk = body !== null && typeof body === "object" && "status" in (body as Record<string, unknown>);
      push("GET /api/health", "PASS", `${res.status} ${statusOk ? "status:ok" : "reachable"} (${url})`);
    } else {
      push("GET /api/health", "FAIL", `HTTP ${res.status} at ${url} — is dev server running? (npm run dev)`);
    }
  } catch (e) {
    clearTimeout(timeout);
    const msg = e instanceof Error ? e.message : String(e);
    const isAbort = msg.includes("abort");
    push("GET /api/health", "FAIL", `${isAbort ? "timeout" : msg} — server not reachable at ${url} (run npm run dev)`);
  }
}

async function checkDbCounts(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    push("DB:divisions>=6", "SKIP", "DATABASE_URL missing — skip DB counts");
    push("DB:staff>=30", "SKIP", "DATABASE_URL missing — skip DB counts");
    return;
  }

  let client: InstanceType<typeof import("@prisma/client").PrismaClient> | null = null;
  try {
    const { PrismaClient } = await import("@prisma/client");
    client = new PrismaClient();
    await client.$connect();

    // Divisions >=6
    try {
      const divCount = await client.division.count();
      if (divCount >= 6) push("DB:divisions>=6", "PASS", `count=${divCount}`);
      else push("DB:divisions>=6", "FAIL", `count=${divCount} < 6 — run npx tsx prisma/seed.ts`);
    } catch (e) {
      const msg = e instanceof Error ? e.message.slice(0, 200) : String(e);
      push("DB:divisions>=6", "FAIL", msg);
    }

    // Staff >=30 (seed expanded from 30 to 34)
    try {
      const staffCount = await client.staff.count();
      if (staffCount >= 30) push("DB:staff>=30", "PASS", `count=${staffCount}`);
      else push("DB:staff>=30", "FAIL", `count=${staffCount} < 30 — run npx tsx prisma/seed.ts`);
    } catch (e) {
      const msg = e instanceof Error ? e.message.slice(0, 200) : String(e);
      push("DB:staff==30", "FAIL", msg);
    }

    // Active desks = 3 (informational, not required to exit 1)
    try {
      const active = await client.staff.count({ where: { status: "active" } });
      if (active === 3) push("DB:active desks==3", "PASS", `active=${active}`);
      else push("DB:active desks==3", "WARN", `active=${active} (expected 3 — seed sets Rina/Alex/Budi active)`);
    } catch {
      // ignore
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 300) : String(e);
    push("DB:connect", "FAIL", msg);
    push("DB:divisions>=6", "FAIL", "DB connect failed");
    push("DB:staff>=30", "FAIL", "DB connect failed");
  } finally {
    if (client) {
      await client.$disconnect().catch(() => {});
    }
  }
}

async function main(): Promise<void> {
  console.log("=== MVP Verify — local-first sanity checks ===");
  console.log(`Base: ${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}`);
  console.log("");

  await checkEnv();
  console.log("");
  await checkPrismaGenerate();
  console.log("");
  await checkHealth();
  console.log("");
  await checkDbCounts();

  console.log("");
  console.log("=== Summary ===");
  for (const r of results) {
    const detail = r.detail ? ` — ${r.detail}` : "";
    console.log(`  ${r.status.padEnd(5)} ${r.name}${detail}`);
  }

  const fails = results.filter((r) => r.status === "FAIL");
  if (fails.length > 0) {
    console.error(`\n${fails.length} check(s) FAILED — see above. Fix and re-run: npx tsx scripts/verify-mvp.ts`);
    process.exit(1);
  } else {
    console.log("\nAll required checks PASS (warnings allowed). MVP local-first ready.");
  }
}

main().catch((e) => {
  console.error("verify-mvp fatal:", e);
  process.exit(1);
});
