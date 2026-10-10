/**
 * 9Router gateway — server-only.
 * Do not import this module in client components. NINE_ROUTER_API_KEY never leaves the server.
 * NOTE: `server-only` package is not installed; we enforce server-only via route handlers + env check.
 * If `server-only` is available, uncomment: import "server-only";
 */

import { db } from "@/lib/db";
import { getModelForRole } from "@/lib/ai/agents";

// ── Types ──────────────────────────────────────────────────────────

export type ChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; name?: string; tool_call_id?: string };
export type AiChatInput = {
  model: string;
  messages: ChatMessage[];
  tools?: unknown[];
  temperature?: number;
  maxTokens?: number;
};
export type AiChatResult = {
  content: string;
  model: string;
  tokens?: number;
  raw: unknown;
};
export type AiDispatchInput = { roleId: string; task: string };
export type AiDispatchResult = AiChatResult & { roleId: string; auditId?: string };

// ── Rate limit (in-memory MVP — 30 req/min per user/ip) ─────────

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;
type Bucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, Bucket>();

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || now >= b.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true };
  }
  if (b.count < RATE_MAX) {
    b.count += 1;
    return { allowed: true };
  }
  const retryAfterSec = Math.ceil((b.resetAt - now) / 1000);
  return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
}

export function resetRateLimit(key?: string): void {
  if (key) rateBuckets.delete(key);
  else rateBuckets.clear();
}

// ── Helpers ────────────────────────────────────────────────────────

function getBaseUrl(): string {
  const v = process.env.NINE_ROUTER_BASE_URL?.trim();
  if (v) return v.replace(/\/$/, "");
  return "https://api.9router.com/v1";
}

function requireApiKey(): string {
  const k = process.env.NINE_ROUTER_API_KEY?.trim();
  if (!k) throw new Error("Missing NINE_ROUTER_API_KEY — set it in .env.local / Vercel Env (server-only)");
  return k;
}

// ── Core: aiChat ─────────────────────────────────────────────────

export async function aiChat(input: AiChatInput): Promise<AiChatResult> {
  const apiKey = requireApiKey();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/chat/completions`;

  const body: Record<string, unknown> = {
    model: input.model,
    messages: input.messages,
  };
  if (input.tools && Array.isArray(input.tools) && input.tools.length) body.tools = input.tools;
  if (typeof input.temperature === "number") body.temperature = input.temperature;
  if (typeof input.maxTokens === "number") body.max_tokens = input.maxTokens;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`9Router chat failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
    model?: string;
    id?: string;
  };

  const content = json?.choices?.[0]?.message?.content ?? "";
  const tokens = json?.usage?.total_tokens;
  const model = json?.model ?? input.model;

  return { content, model, tokens, raw: json };
}

// ── aiDispatch — fetch Role, resolve model, call aiChat, log audit ─

export async function aiDispatch(input: AiDispatchInput): Promise<AiDispatchResult> {
  const role = await db.role.findUnique({
    where: { id: input.roleId },
    include: { division: true } as unknown as object,
  } as never);

  if (!role) throw new Error(`Role not found: ${input.roleId}`);

  // Resolve model: role.modelVia9Router or division default
  const divisionName = (role as unknown as { division?: { name: string } | null }).division?.name ?? null;
  const model = getModelForRole(role as unknown as Parameters<typeof getModelForRole>[0], divisionName);

  const systemPrompt =
    (role as unknown as { systemPrompt?: string | null }).systemPrompt ??
    `You are ${ (role as unknown as { title?: string }).title ?? "AI Staff"} — execute the task faithfully.`;

  const chatResult = await aiChat({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: input.task },
    ],
  });

  // Audit log — best-effort, do not fail dispatch if audit write fails
  let auditId: string | undefined;
  try {
    const audit = await db.auditLog.create({
      data: {
        who: (role as unknown as { title?: string }).title ?? String(input.roleId),
        action: "aiDispatch",
        targetId: input.roleId,
        modelUsed: chatResult.model,
        tokens: chatResult.tokens ?? null,
      } as never,
    } as never);
    auditId = (audit as { id: string }).id;
  } catch {
    // swallow — audit is observability, not critical path
  }

  return { ...chatResult, roleId: input.roleId, auditId };
}
