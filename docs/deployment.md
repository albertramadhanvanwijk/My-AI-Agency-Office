# Deployment Guide — My AI Agency Office

Env-switch publish to Vercel — no code change required. All behaviour is driven by environment variables; app detects Vercel vs local via `NODE_ENV`/`VERCEL` and standard Next.js runtime.

---

## 1. Architecture on Vercel

- **Framework:** Next.js 15 (App Router), build via `next build` (see `vercel.json`).
- **Custom Socket server (`server.ts`) is NOT used on Vercel.** Vercel's serverless model does not support a long-lived `http.createServer` + Socket.io on port 3001. The API remains fully functional; realtime WS features gracefully degrade to polling / are no-ops in that environment (documented limitation). For sticky WS, deploy a separate Fly.io/Render Node service for `server.ts`.
- **DB:** Postgres (Supabase **or** Vercel Postgres — both compatible via `DATABASE_URL`).
- **Health:** `GET /api/health` — unconditional 200, reports `db: ok|fail`, uptime, version.

---

## 2. Env Switch Checklist (no code change)

Set these in **Vercel Dashboard → Project → Settings → Environment Variables** (Production). Every key below is already read via `lib/env.ts` — adding/changing them and redeploying is the only publish step.

| Variable | Required | Where to get it | Notes |
|---|---|---|---|
| `DATABASE_URL` | ✅ | Supabase: Dashboard → Database → Connection string (pooler `…:6543` recommended) · or Vercel Postgres: Storage → Create → copy URL | Must include `?sslmode=require` on Supabase direct. Keep `pgbouncer=true` if using `6543`. |
| `NEXTAUTH_URL` | ✅ | `https://<your-app>.vercel.app` | Must exactly match deployed URL (no trailing slash). Mismatch → friendly auth error page, not 500. |
| `NEXTAUTH_SECRET` | ✅ | `openssl rand -base64 32` (or any 32+ char random) | Same across preview/production if sharing cookies not needed; rotate = all sessions invalidated. |
| `GOOGLE_CLIENT_ID` | for Google login | Google Cloud Console → Credentials → OAuth 2.0 Client |  |
| `GOOGLE_CLIENT_SECRET` | for Google login | Google Cloud Console → Credentials → OAuth 2.0 Client |  |
| **Google OAuth redirect URI** | config step | Add in Google Console → Authorized redirect URIs: `https://<your-app>.vercel.app/api/auth/callback/google` | Add **both** localhost and production URIs so local dev keeps working. |
| `NINE_ROUTER_API_KEY` | AI features | 9Router dashboard | Server-only (`lib/ai/router.ts` never ships to browser). Leakage check: `grep -R NINE_ROUTER app/` should return 0. |
| `NEXT_PUBLIC_APP_URL` | optional | `https://<your-app>.vercel.app` | Public canonical URL for metadata/links. Fallback is `NEXTAUTH_URL`/`localhost:3000`. |

Optional:

| Variable | Default | Notes |
|---|---|---|
| `NINE_ROUTER_BASE_URL` | `https://api.9router.com/v1` | Override only if gateway URL changes. |

`.env.example` is the source of truth locally.

> Credentials-only login still works if Google vars are blank; AI features (PM WBS, QA) degrade gracefully when `NINE_ROUTER_API_KEY` is blank.

---

## 3. Supabase vs Vercel Postgres — setup steps

### Option A — Supabase (recommended for local parity)

1. Create project at https://supabase.com → copy **Connection string → Transaction pooler** (6543).
2. DB name/user/password from Supabase project settings.
3. Paste into Vercel env as `DATABASE_URL` (use `?pgbouncer=true&connection_limit=1` query if Supabase template omits it).
4. Allow Vercel IPs (Supabase → Database → Network restrictions → allow all or Vercel ranges).

### Option B — Vercel Postgres (zero external setup)

1. Vercel Dashboard → Storage → Create → Postgres → choose region `sin1` (near `vercel.json` regions).
2. It auto-injects `DATABASE_URL` (and `POSTGRES_PRISMA_URL`) into Environment Variables — no manual paste needed.
3. If your code also reads `POSTGRES_*`, no change required — `DATABASE_URL` is the single source used by `lib/db.ts`.

> Either option: DB must be reachable at **build time** for `prisma generate` and at **runtime** for `prisma migrate deploy` (next step). Test locally with `psql "$DATABASE_URL" -c "select 1"` before deploying.

---

## 4. Database migrate & seed

All commands are run **once per fresh DB** (or per deploy if migrations changed). On Vercel itself there is no build-time shell beyond `vercel.json:buildCommand`, so migrate/seed are done externally via your machine or Vercel CLI pointed at prod `DATABASE_URL`.

```bash
# Point local shell at production DB (export before running — do NOT commit .env)
export DATABASE_URL="postgresql://…?sslmode=require&pgbouncer=true"

# 1. Generate client (needed even if node_modules already has it)
npx prisma generate

# 2. Apply migrations without creating new ones (production-safe)
npx prisma migrate deploy

# 3. Seed idempotent roster (6 divisions, 30 staff, rooms/desks, demo users)
npm run db:seed
# or: npx tsx prisma/seed.ts
```

If `migrate deploy` says "no pending migrations", you are already at latest.
If seed is skipped because data exists, that is expected — seed is `upsert`-idempotent.

Re-run `migrate deploy` on **every** production deploy where `prisma/migrations` changed. The Vercel build does **not** call it — deliberate, to avoid concurrent migration races.

---

## 5. Health check

- Route: `GET /api/health`
- Behaviour:
  - Always returns HTTP 200 with JSON `{ status:"ok", ts, uptime, version, db:"ok"|"fail", dbLatencyMs, env }`.
  - DB is pinged with `SELECT 1` under a 2s timeout. Failure does **not** flip HTTP status — caller inspects `db`. No sensitive data (no `DATABASE_URL`, no `NEXTAUTH_SECRET`, no headers) ever returned.
  - Works locally even with no DB (reports `db:"fail"` + truncated error, still 200 — local-first contract).
- Vercel cron (keeps functions warm / log signal): `vercel.json` defines `crons: [{ path:"/api/health", schedule:"*/10 * * * *" }]`. If you do not want the cron, delete the `crons` array — health works without it.
- Keep the cron path as `/api/health` (no auth) so no auth headers are needed. Vercel Cron invokes it with `user-agent: vercel-cron/1.0`.

Manual check:

```bash
curl -s https://<your-app>.vercel.app/api/health | jq
curl -s http://localhost:3000/api/health | jq  # local
# expect: { status: "ok", db: "ok"|"fail", version: "0.1.0", ... }
```

---

## 6. Publish via env switch only (no code change)

This project enforces "env switch only": the same Git commit runs locally and on Vercel. Publish = set env vars + redeploy.

1. Go to Vercel Dashboard → **Add New Project** → import Git repo (or connect existing).
   - **Build Command** and **Install Command** are already in `vercel.json`; Vercel auto-picks them — leave Defaults if prompted.
   - Or leave them empty — `vercel.json` is authoritative.
2. Paste env vars per checklist §2 (Production).
3. **Deploy** (automatic on push to `master`/`main`).
4. If migrations exist (step §4), run `npx prisma migrate deploy` against the prod `DATABASE_URL` from your machine before or right after first deploy (app handles existing DB fine, but new tables require the migration).
5. Verify: `curl https://<your-app>.vercel.app/api/health` → `db:"ok"`; open `/login` → Google redirect URI works; `/dashboard` loads; `/api/health` 200 without auth.

Subsequent publishes: push to Git → Vercel builds using `vercel.json:buildCommand` (`prisma generate && next build`) → auto-deploy. No code branch `if (process.env.VERCEL)` needed anywhere.

---

## 7. Local-first contract

- MVP targets `http://localhost:3000`. Validate locally before any Vercel step:

  ```bash
  cp .env.example .env.local  # fill DATABASE_URL (local pg), NEXTAUTH_SECRET (any), NEXTAUTH_URL=http://localhost:3000
  npx prisma generate && npx prisma migrate dev --name init
  npm run db:seed
  npm run dev  # tsx server.ts → Next + Socket.io on :3001
  curl -s http://localhost:3000/api/health | jq  # still 200 without DB
  npm run build && npm run test  # lint + vitest + build clean
  ```

- `server.ts` (custom Socket.io) only runs with `npm run dev` / `npm run start` (node server.js). On Vercel, Next standalone server is used — `server.ts` is not invoked (no port to bind). Both paths run the same API and pages.

---

## 8. Rollback

- **Code rollback:** Vercel Dashboard → Deployments → previous deployment → **Promote to Production** (instant DNS switch). No DB change needed if schema did not change.
- **Schema rollback:** Prisma has no automatic down-migration. If a migration broke prod:
  1. `git revert` the migration commit that added files under `prisma/migrations/`.
  2. Manually fix DB to prior shape (restore from Supabase PITR/backup, or apply a corrective migration).
  3. Re-run `npx prisma migrate deploy` against prod `DATABASE_URL` after revert.
  4. Redeploy.
- **Env rollback:** revert variable in Vercel Env history → Redeploy (new build required for `NEXTAUTH_URL` / `GOOGLE_*` to take effect).
- **Full panic:** pin deployment and revert `DATABASE_URL` to last known-good DB snapshot (Supabase → Backups → Restore).

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Invalid `NEXTAUTH_URL`` / OAuth `redirect_uri_mismatch` | `NEXTAUTH_URL` ≠ deployed URL or Google redirect URI missing | Set `NEXTAUTH_URL=https://<app>.vercel.app` (no slash), add `https://<app>.vercel.app/api/auth/callback/google` in Google Console. |
| Build fails `Can't reach database` | `DATABASE_URL` set at runtime only but build also needs it for `prisma generate` | Add `DATABASE_URL` to Vercel Build environment too (same var — Production + Preview). `prisma generate` itself does not connect, but any build-time import chain touching `lib/db.ts` will. |
| Health `db:"fail"` | DB unreachable / pooler wrong port / `sslmode` missing | Check `psql` connectivity; for Supabase direct use `5432?sslmode=require`, for pooler `6543?pgbouncer=true`; allowlist Vercel IPs. |
| WS / realtime does not work on Vercel | Expected — serverless | Deploy `server.ts` to Fly.io/Render as a separate service, or replace with Vercel-adjacent realtime (Ably/Pusher/Supabase Realtime). App still fully usable without WS. |
| Standby job never fires on Vercel | `setInterval` in `server.ts` doesn't run serverless | Wire `POST /api/crons/standby` (wrap `runStandbyJob`) and add a second entry to `vercel.json:crons` — or run BullMQ worker off-Vercel. |

---

## 10. Security notes

- Never commit `.env*` (already gitignored). Vercel Env is encrypted at rest.
- `NINE_ROUTER_API_KEY` is server-only (`lib/ai/router.ts` guards + `lib/env.ts` never exposes with `NEXT_PUBLIC_`). Before deploy, run `grep -R "NINE_ROUTER" app lib --include="*.ts" --include="*.tsx"` — should return only server files.
- `app/api/health` never returns connection strings, secrets, or request headers.
