/**
 * Model routing per role — maps roles.modelVia9Router to actual model strings.
 * Falls back to division defaults when role has no explicit model.
 */

export const DEFAULT_MODELS: Record<string, string> = {
  "Strategy & Planning": "anthropic/claude-3.5-sonnet",
  "Creative & Content": "anthropic/claude-3.5-sonnet",
  "Technology & Product": "openai/gpt-4o",
  "Marketing & Growth": "openai/gpt-4o",
  "Client Relations": "openai/gpt-4o",
  "Finance, Legal & Admin": "openai/gpt-4o",
  // Fallback for unknown divisions
  default: "openai/gpt-4o",
};

export const GLOBAL_DEFAULT_MODEL = "openai/gpt-4o";

/**
 * Resolve model for a role row.
 * role: { modelVia9Router?: string|null, division?: { name: string } | null, divisionId?: string }
 * divisionName: optional explicit division name (preferred when role.division not populated)
 */
export function getModelForRole(
  role: { modelVia9Router?: string | null; division?: { name: string } | null; title?: string } | null | undefined,
  divisionName?: string | null
): string {
  if (role?.modelVia9Router && String(role.modelVia9Router).trim()) {
    return String(role.modelVia9Router).trim();
  }
  const divName = divisionName ?? role?.division?.name ?? null;
  if (divName && DEFAULT_MODELS[divName]) return DEFAULT_MODELS[divName];
  return GLOBAL_DEFAULT_MODEL;
}

const agentsDefault = { DEFAULT_MODELS, GLOBAL_DEFAULT_MODEL, getModelForRole };
export default agentsDefault;
