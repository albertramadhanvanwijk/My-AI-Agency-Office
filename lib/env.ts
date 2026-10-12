/**
 * Typed env accessor. Validates required server env at import time.
 * Throws if NEXTAUTH_SECRET is missing (required by toolchain test).
 * Client-safe keys (NEXT_PUBLIC_*) are optional.
 */

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") throw new Error(`Missing required env: ${name}`);
  return v;
}

function optionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

// Eager validation — toolchain test expects throw when NEXTAUTH_SECRET missing
const _nextAuthSecret = requireEnv("NEXTAUTH_SECRET");

export const env = {
  get DATABASE_URL() {
    return optionalEnv("DATABASE_URL");
  },
  get NEXTAUTH_URL() {
    return optionalEnv("NEXTAUTH_URL", "http://localhost:3000");
  },
  get NEXTAUTH_SECRET() {
    return _nextAuthSecret;
  },
  get GOOGLE_CLIENT_ID() {
    return optionalEnv("GOOGLE_CLIENT_ID");
  },
  get GOOGLE_CLIENT_SECRET() {
    return optionalEnv("GOOGLE_CLIENT_SECRET");
  },
  get NINE_ROUTER_API_KEY() {
    return optionalEnv("NINE_ROUTER_API_KEY");
  },
  get NINE_ROUTER_BASE_URL() {
    return optionalEnv("NINE_ROUTER_BASE_URL", "https://api.9router.com/v1");
  },
  get REDIS_URL() {
    return optionalEnv("REDIS_URL");
  },
  get REDIS_HOST() {
    return optionalEnv("REDIS_HOST");
  },
  get REDIS_PORT() {
    return optionalEnv("REDIS_PORT", "6379");
  },
  get REALTIME_PORT() {
    return optionalEnv("REALTIME_PORT", "3001");
  },
  get NEXT_PUBLIC_APP_URL() {
    return optionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  },
} as const;

// Re-export for convenience in tests that check named export existence
export default env;
