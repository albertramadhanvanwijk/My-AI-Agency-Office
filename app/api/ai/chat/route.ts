import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { aiChat, checkRateLimit } from "@/lib/ai/router";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as
    | { user?: { id?: string; email?: string | null; role?: string } }
    | null;
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = String(session?.user?.id ?? session?.user?.email ?? req.headers.get("x-forwarded-for") ?? "anon");
  const rl = checkRateLimit(`chat:${key}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec ?? 60) } }
    );
  }

  let body: { model?: string; messages?: Array<{ role: string; content: string }>; tools?: unknown[] };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const model = String(body?.model ?? "").trim();
  const messages = body?.messages;
  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "model and messages are required" }, { status: 400 });
  }

  try {
    const result = await aiChat({ model, messages: messages as never, tools: body.tools as never });

    // Audit — best-effort
    try {
      await db.auditLog.create({
        data: {
          who: String(session.user?.id ?? session.user?.email ?? "unknown"),
          action: "aiChat",
          targetId: null,
          modelUsed: result.model,
          tokens: result.tokens ?? null,
        } as never,
      } as never);
    } catch {
      // swallow
    }

    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Missing key is 500 (server misconfig), upstream failure also 502/500
    const status = /NINE_ROUTER_API_KEY/i.test(msg) ? 500 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
