import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiDispatch, checkRateLimit } from "@/lib/ai/router";

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as
    | { user?: { id?: string; email?: string | null; role?: string } }
    | null;
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = String(session?.user?.id ?? session?.user?.email ?? req.headers.get("x-forwarded-for") ?? "anon");
  const rl = checkRateLimit(`dispatch:${key}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
    );
  }

  let body: { roleId?: string; task?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const roleId = String(body?.roleId ?? "").trim();
  const task = String(body?.task ?? "").trim();
  if (!roleId || !task) {
    return NextResponse.json({ error: "roleId and task are required" }, { status: 400 });
  }

  try {
    const result = await aiDispatch({ roleId, task });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Role not found/i.test(msg)) return NextResponse.json({ error: msg }, { status: 404 });
    if (/NINE_ROUTER_API_KEY/i.test(msg)) return NextResponse.json({ error: msg }, { status: 500 });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
