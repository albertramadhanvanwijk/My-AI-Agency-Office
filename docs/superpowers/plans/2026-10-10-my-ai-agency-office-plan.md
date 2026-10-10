# My AI Agency Office Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Fase 1 MVP of My AI Agency Office — a modular-monolith Web App (Next.js 15 + R3F isometric Cozy Creative 3D diorama, layout persis foto referensi) with 30-role AI hierarchy (active on-demand 3+ N, grace 48j), 7-stage workflow + provisional division, 12-domain DB, Google OAuth, invoice & chat terpisah — running locally at `localhost:3000`, publish-ready via env switch.

**Architecture:** Modular Monolith Next.js 15 (App Router) — one codebase, isolated per-division modules in `/modules/[division]/`. 3D canvas (React Three Fiber) embedded inside Dashboard. PostgreSQL + Prisma, Auth.js (Google OAuth + Credentials), 9Router gateway (server-only), Socket.io realtime, BullMQ jobs. Local-first (Docker Supabase or RLS cloud), deploy to Vercel in Fase 2.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind, shadcn/ui, React Three Fiber + Drei, Prisma + PostgreSQL (Supabase), Auth.js, 9Router SDK + Vercel AI SDK, Socket.io, BullMQ/Trigger.dev, Vercel, Jest/Vitest + Playwright

**Spec:** `docs/superpowers/specs/2026-10-10-my-ai-agency-office-design.md`
**Diagram:** `docs/business-process-diagram.html`

## Global Constraints

- Directory is `My AI Agency Office` — all work here. Every task that passes its tests → commit & push to GitHub.
- Local-first: MVP runs at `http://localhost:3000`; publish is env switch only (no `if (local)` branches). `.env*` never committed.
- 9Router API key never reaches browser — server-only via `lib/ai/router.ts`.
- TypeScript strict, next lint clean, no `any` without justification.
- TDD: write failing test → make it pass → verify → commit.
- Commit messages: conventional (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).

## Review Focus

- **Invalid Google OAuth callback** (wrong `NEXTAUTH_URL` or missing redirect URI) → user should see a clear auth error page, not a 500.
- **9Router rate-limit / quota exceeded** during task dispatch → job should retry 2× then dead-letter + notify PM/Owner, not hang.
- **Concurrent activations** for same project (two rapid dispatch calls) → staff should not spawn duplicate desks; idempotent.
- **Klien accesses another client's project/invoice via URL tampering** → 403, not 404 leak.
- **3D canvas with 0 active desks** (idle 3 jaga only vs 0) → should render lobby + flexible floor without crashing.

---

### Task 1: Project Scaffolding & Toolchain (Fase 0 Start)

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `components.json` (shadcn), `.env.example`, `lib/env.ts`, `.eslintrc.json`
- Modify: `README.md` (add dev instructions)
- Test: `__tests__/toolchain.test.ts` (build + lint smoke)

**Interfaces:**
- Consumes: nothing
- Produces: `lib/env.ts` exports `env` (typed env accessor, throws if required missing); `npm run dev` serves empty Next app at localhost:3000.

- [ ] **Step 1: Write failing test `__tests__/toolchain.test.ts`** — asserts `env.NEXTAUTH_SECRET` requires env and `npm run build` would be invoked (smoke: check `lib/env.ts` exports `env` and throws when `NEXTAUTH_SECRET` missing).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/toolchain.test.ts -v`
Expected: FAIL — module not found / env not defined

- [ ] **Step 3: Scaffold Next.js 15 + TS + Tailwind + shadcn + ESLint in this folder**

Init: `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir false --import-alias "@/*"` (accept defaults, allow overwrite of README if needed — preserve spec docs). Then `npx shadcn@latest init` (default). Add `lib/env.ts` with typed env + validation. Add `.env.example` listing `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NINE_ROUTER_API_KEY`, `NEXT_PUBLIC_APP_URL`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/toolchain.test.ts -v` and `npm run lint` and `npm run build` (dry)
Expected: toolchain test PASS, lint clean (warnings allowed), build succeeds

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.mjs components.json lib/env.ts .env.example __tests__/toolchain.test.ts
git commit -m "chore: scaffold Next.js 15 + TS + Tailwind + shadcn + env"
```

---

### Task 2: Database & ORM — Prisma + 12-Domain Schema (Fase 0)

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`, `lib/db.ts`, `__tests__/db.test.ts`
- Modify: `package.json` (prisma scripts), `.env.example` (DATABASE_URL)
- Test: `__tests__/db.test.ts`

**Interfaces:**
- Consumes: Task 1 toolchain
- Produces: `lib/db.ts` exports `db: PrismaClient` (singleton); `prisma/schema.prisma` with 14 tables; `prisma/seed.ts` seeds roster 30 + 6 divisions + rooms/desks JSON from foto layout + capabilities; `npx prisma generate && npx prisma migrate dev` works locally.

- [ ] **Step 1: Write failing test `__tests__/db.test.ts`**

```ts
import { db } from "@/lib/db";
it("connects and has seeded divisions", async () => {
  const count = await db.division.count();
  expect(count).toBeGreaterThanOrEqual(6);
});
it("seeded staff roster is 30", async () => {
  expect(await db.staff.count()).toBe(30);
});
it("invoices and conversations tables exist", async () => {
  expect(await db.invoice.count()).toBeGreaterThanOrEqual(0);
  expect(await db.conversation.count()).toBeGreaterThanOrEqual(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/db.test.ts -v`
Expected: FAIL — schema not generated / tables not found

- [ ] **Step 3: Implement `prisma/schema.prisma` with 14 tables (per spec §7) + `lib/db.ts` singleton + `prisma/seed.ts`**

Tables: `User` (role OWNER|CLIENT), `Division` (status active|provisional|archived), `Role` (modelVia9Router, tools Json), `Staff` (status active|standby|break, deskId), `Room` (type lobby|division|meeting|amenity, floor), `Desk` (clusterId, staffId nullable), `Client`, `Project` (status 7 stage enum, provisionalDivisionId), `Task` (status todo|progress|review|done), `Proposal` (type division|role|room, status pending|approved|rejected), `AuditLog`, `Invoice` (status draft|sent|paid|overdue|cancelled, pdfUrl), `Conversation` (type project|direct, participantIds Json), `Message` (senderType human|ai_staff, modelVia9Router). Add `RoleTool`/`DivisionCapability` joins. Seed: 6 divisions (Strategy, Creative, Tech, Marketing, ClientRelations, FinanceAdmin) + 30 staff per §4 roster + rooms/desks: foto layout persis — 4 kiri + 4 kanan + 3 atas + lobby bawah + 16 cluster tengah (but only N active desks per staff.status) + 3 amenity (Pantry, Musholla, BreakRoom) — initially all staff standby except 3 jaga (Resepsionis, MD, PM → active). Seed must be idempotent (`upsert`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx prisma generate && npx prisma migrate dev --name init` (requires Supabase local or `DATABASE_URL` to postgres) then `npx vitest run __tests__/db.test.ts -v`
Expected: all PASS (requires local postgres — use Supabase local Docker `npx supabase start` if needed; task may use SQLite for CI smoke — but postgres types must match)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts lib/db.ts __tests__/db.test.ts
git commit -m "feat: prisma schema 14 tables + seed 30 roster + foto layout rooms/desks"
```

---

### Task 3: Auth — Auth.js with Google OAuth + Credentials + Guards (Fase 0)

**Files:**
- Create: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `middleware.ts`, `__tests__/auth.test.ts`, `components/auth/*`
- Modify: `lib/env.ts`, `.env.example`
- Test: `__tests__/auth.test.ts`, e2e `e2e/auth.spec.ts` (Playwright)

**Interfaces:**
- Consumes: Tasks 1-2
- Produces: `lib/auth.ts` exports `authOptions: NextAuthOptions` (Google + Credentials, JWT, callbacks set `session.user.role`); `middleware.ts` guards `/dashboard/*` → OWNER, `/portal/*` → CLIENT/OWNER; `GET /api/auth/*` works.

- [ ] **Step 1: Write failing test `__tests__/auth.test.ts`**

```ts
it("middleware redirects unauthenticated /dashboard to /login", async () => { /* fetch /dashboard without session → 307 to /login */ });
it("CLIENT cannot access /dashboard (403/redirect)", async () => {});
it("Google provider is configured", () => { expect(authOptions.providers.some(p=>p.id==='google')).toBe(true); });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/auth.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Implement `lib/auth.ts` (Auth.js v5 or v4 — pick one and stick), `middleware.ts`**

Auth.js with providers: `Google({clientId: env.GOOGLE_CLIENT_ID, ...})` + `Credentials` (email/password vs `User.passwordHash` via bcrypt). Adapter: PrismaAdapter if using Auth.js v5, or manual user lookup. JWT callback sets `token.role`. Session callback exposes `session.user.role` + `userId`. `middleware.ts`: matchers `/dashboard/:path*` (require OWNER), `/portal/:path*` (require CLIENT|OWNER own project), `/api/*` (require session). Unauthenticated → redirect to `/login`. Add `/login` page with Google button + email form. Handle invalid callback gracefully (error page, not 500).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/auth.test.ts -v` and `npx playwright test e2e/auth.spec.ts` (if added)
Expected: PASS; `NEXTAUTH_URL` mismatch shows friendly error, not 500 (Review Focus)

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts "app/api/auth/[...nextauth]/route.ts" middleware.ts app/login __tests__/auth.test.ts
git commit -m "feat: auth Google OAuth + credentials + role guards (OWNER vs CLIENT)"
```

---

### Task 4: Layout Shell & Navigation (Fase 0)

**Files:**
- Create: `app/layout.tsx`, `app/page.tsx` (landing → redirect to /lobby or /login), `app/(dashboard)/layout.tsx`, `components/layout/Sidebar.tsx`, `components/layout/Header.tsx`, `components/ui/*` (shadcn: button, card, badge)
- Test: `__tests__/layout.test.ts`

**Interfaces:**
- Consumes: Tasks 1-3
- Produces: `app/(dashboard)/layout.tsx` renders Sidebar (6 Divisi + Lobby + Organization + Portal) + Header (online count, project active). `Sidebar` reads divisions from DB.

- [ ] **Step 1: Write failing test `__tests__/layout.test.ts`** — renders `(dashboard)/layout` and asserts Sidebar contains "Lobby" and 6 division names; Header shows online count element.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/layout.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Implement layouts with shadcn, Tailwind, responsive grid** — App shell, sidebar collapse on mobile, active nav highlight, header with session user + role badge.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/layout.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx "app/(dashboard)/layout.tsx" components/layout
git commit -m "feat: dashboard shell + sidebar + header"
```

---

### Task 5: 3D Live Office — Isometric Diorama Cozy Creative (Layout Foto)

**Files:**
- Create: `components/3d-office/OfficeCanvas.tsx`, `components/3d-office/prefabs/RoomGlass.tsx`, `components/3d-office/prefabs/DeskCluster.tsx`, `components/3d-office/prefabs/Lobby.tsx`, `components/3d-office/prefabs/AmenityRoom.tsx`, `components/3d-office/Avatar.tsx`, `components/3d-office/useOfficeLayout.ts`, `lib/office/layout.json` (rooms+desks JSON from seed, mirrored), `__tests__/office3d.test.tsx`
- Modify: `prisma/seed.ts` (ensure room prefabs match)
- Test: `__tests__/office3d.test.tsx`

**Interfaces:**
- Consumes: Tasks 1-4; reads `rooms` + `desks` (via API or props)
- Produces: `OfficeCanvas` renders at `/lobby` inside Dashboard — isometric fix camera (~30° top-down), prefabs (RoomGlass, DeskCluster with sekat tanaman, Lobby, Amenity), Avatar (chibi, dot green/gray/yellow, nameplate). Click room → filter staff drawer; click avatar → chat drawer. Only `active` desks rendered; flexible floor (polish + tanaman) fills empty area. Responsive fallback to list on mobile.

- [ ] **Step 1: Write failing test `__tests__/office3d.test.tsx`**

```ts
it("renders lobby and does not crash with 0 active desks", () => { render(<OfficeCanvas rooms={mockRooms} desks={[]} />); expect(screen.getByText(/LOBBY/i)).toBeInTheDocument(); });
it("renders N desks for N active staff", () => { /* pass 3 active desks → 3 DeskCluster rendered */ });
it("clicking a room filters staff drawer", async () => { /* click RoomGlass → onRoomSelect called with divisionId */ });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/office3d.test.tsx -v`
Expected: FAIL

- [ ] **Step 3: Implement R3F canvas** — `Canvas` from `@react-three/fiber`, orthographic camera isometrik, `OrbitControls` disabled (fix angle, allow pan/zoom limited). Prefabs as reusable meshes with props `{position, size, color, divisionId, capacity}`. `DeskCluster` = 4 desks + sekat tanaman mesh. `Avatar` = capsule + dot + nameplate (Html overlay via `drei`). Drawer on select (shadcn Drawer/Sheet). Grace empty handled. Performance: frustum cull, low-poly.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/office3d.test.tsx -v`
Expected: PASS; manual: `npm run dev` → `/lobby` shows building persegi, lobby bawah, 4+4+3 perimeter, middle clusters for active only, click works (Review Focus 0 desks)

- [ ] **Step 5: Commit**

```bash
git add components/3d-office lib/office __tests__/office3d.test.tsx
git commit -m "feat: 3D isometric diorama Cozy Creative (layout foto) — active desks only"
```

---

### Task 6: AI Orchestrator — 9Router Gateway (Server-Only)

**Files:**
- Create: `lib/ai/router.ts`, `lib/ai/agents.ts`, `lib/ai/tools.ts`, `app/api/ai/chat/route.ts`, `app/api/ai/dispatch/route.ts`, `__tests__/ai.test.ts`
- Modify: `lib/env.ts`
- Test: `__tests__/ai.test.ts`

**Interfaces:**
- Consumes: Tasks 1-3 (auth for /api)
- Produces: `lib/ai/router.ts` exports `aiChat({model, messages, tools})` and `aiDispatch({roleId, task})` — proxies to 9Router (fetch), never exposes `NINE_ROUTER_API_KEY` to client; `agents.ts` maps `roles.modelVia9Router`; `tools.ts` defines tool schemas per division; `/api/ai/*` requires session, rate-limited, logs to `audit_logs`.

- [ ] **Step 1: Write failing test `__tests__/ai.test.ts`**

```ts
it("router throws if NINE_ROUTER_API_KEY missing", async () => {});
it("/api/ai/chat requires auth (401 without session)", async () => {});
it("aiDispatch logs to audit_logs with modelUsed", async () => { /* mock 9Router fetch, assert audit log created */ });
it("rate limit returns 429 after threshold", async () => {});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/ai.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Implement `lib/ai/router.ts` (fetch to 9Router), `agents.ts` (model routing per role), `tools.ts`, API routes with auth + rate limit (Upstash/ in-memory for MVP) + audit logging**

Use Vercel AI SDK `generateText`/`streamText` wrapper around 9Router OpenAI-compatible endpoint. `NINE_ROUTER_API_KEY` only in `env`. Tools: image-gen, web-search, code-sandbox, analytics, invoice-gen stubs (real impl later). Rate limit 30 req/min per user.

- [ ] **Step 4: Run test to verify it passes (mock fetch)**

Run: `npx vitest run __tests__/ai.test.ts -v`
Expected: PASS; verify no key in client bundle (`grep NINE_ROUTER`)

- [ ] **Step 5: Commit**

```bash
git add lib/ai "app/api/ai" __tests__/ai.test.ts
git commit -m "feat: 9Router gateway server-only + model routing + rate-limit + audit"
```

---

### Task 7: Realtime & Active Presence (Socket.io + Grace 48j)

**Files:**
- Create: `lib/realtime/server.ts`, `lib/realtime/client.ts`, `hooks/usePresence.ts`, `app/api/presence/route.ts`, `lib/jobs/standby.ts`, `__tests__/realtime.test.ts`
- Test: `__tests__/realtime.test.ts`

**Interfaces:**
- Consumes: Tasks 2,5,6
- Produces: WS presence: `staff.status` (active|standby|break) broadcast; `usePresence` hook for 3D dot; `/api/presence` toggle active/standby; `standby.ts` cron/job checks `projects` + last activity >48h → auto-standby (meja fade out). Idempotent activation (no duplicate desks).

- [ ] **Step 1: Write failing test `__tests__/realtime.test.ts`** — two concurrent `activateStaff(staffId)` should result in 1 desk (idempotent); auto-standby after 48h mock time moves staff to standby; presence emits on status change.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/realtime.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Implement Socket.io server (Next.js custom server or Route Handler + polling fallback for MVP), client hook, presence API, standby job (BullMQ or setTimeout cron)**

Activation: `UPDATE Staff SET status='active', deskId=... WHERE status='standby'` — dedup via unique `staffId`. WS rooms per office. Grace: `setInterval` or BullMQ delayed job on project closing.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/realtime.test.ts -v`
Expected: PASS; manual WS event observed

- [ ] **Step 5: Commit**

```bash
git add lib/realtime hooks/usePresence.ts lib/jobs/standby.ts __tests__/realtime.test.ts
git commit -m "feat: realtime presence + idempotent activation + grace 48j auto-standby"
```

---

### Task 8: Workflow 7 Stage + PM Dispatch + Kanban (Core MVP)

**Files:**
- Create: `modules/workflow/schema.ts`, `modules/workflow/service.ts`, `modules/workflow/actions.ts`, `app/(dashboard)/projects/**`, `components/kanban/*`, `__tests__/workflow.test.ts`, `e2e/project.spec.ts`
- Modify: `lib/ai/*` (PM delegation), `lib/db.ts`
- Test: `__tests__/workflow.test.ts`, `e2e/project.spec.ts`

**Interfaces:**
- Consumes: Tasks 2-7
- Produces: `workflow/service.ts` exports `createProject`, `approveGate`, `buildWBS`, `dispatch(task, roleId)` (enqueue BullMQ), `qaConsolidate`, `deliver`, `requestRevision`, `closeProject`; Kanban at `/projects/[id]` (ToDo→Progress→Review→Done); Project list at `/projects`.

- [ ] **Step 1: Write failing test `__tests__/workflow.test.ts`**

```ts
it("7-stage lifecycle: inquiry→brief→gate1→planning→gate2→execution→qa→delivery→closing", async () => {});
it("Gate 1 without Owner + Client approval stays in BRIEF", async () => {});
it("dispatch enqueues job and activates staff (desk appears)", async () => {});
it("revision loops back to EXECUTION, max revisi enforced", async () => {});
it("gap check: unknown division → provisional + proposal created", async () => {}); // provisional Opsi C
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/workflow.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Implement workflow service + server actions + Kanban UI**

Enums: `ProjectStatus = INQUIRY|BRIEF|PLANNING|EXECUTION|QA|DELIVERY|CLOSING` (7 stage). Gates as status checks requiring both approvals (`ProjectApproval` join or fields `briefApprovedByOwner/Klien`). WBS builder: PM via 9Router generates tasks per division (use `lib/ai/router` + template). Dispatch: BullMQ `jobs.add(dispatch, {taskId, roleId})` → worker calls `aiDispatch` → updates `Task.resultAssetUrl` → emits WS. QA: Manager+Head check via AI tool; PM final QA. Delivery: aggregate assets → `resultAssetUrl` in portal. Revision: new tasks with `parentTaskId`. Provisional: if capability missing → create `Division(status=provisional)` + `Proposal(type=division, status=pending, triggerProjectId)` — project continues in provisional `rooms` (meeting virtual).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/workflow.test.ts -v` and `npx playwright test e2e/project.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add modules/workflow "app/(dashboard)/projects" components/kanban __tests__/workflow.test.ts
git commit -m "feat: workflow 7 stage + PM dispatch + Kanban + provisional proposal"
```

---

### Task 9: Client Portal (Brief, Progress, Deliverable, Revisi, Approve)

**Files:**
- Create: `app/(portal)/portal/layout.tsx`, `app/(portal)/portal/projects/[id]/page.tsx`, `components/portal/*`, `__tests__/portal.test.ts`
- Modify: `middleware.ts` (portal guard)
- Test: `__tests__/portal.test.ts`

**Interfaces:**
- Consumes: Tasks 3,8
- Produces: `/portal` — client sees only own projects; project detail: brief, Kanban read-only, deliverables, `Approve` / `Request Revision` buttons (with reason), timeline log.

- [ ] **Step 1: Write failing test `__tests__/portal.test.ts`** — CLIENT sees own project, not others (403 on tampered id); OWNER sees all; Approve moves project status; Revisi creates new tasks (Review Focus: URL tampering → 403).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/portal.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Implement Portal pages + API checks `where: {clientId: session.client.id}`**

List + detail, status badge, asset preview (Storage signed URL), action forms via server actions with zod validation.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/portal.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "app/(portal)" components/portal __tests__/portal.test.ts
git commit -m "feat: client portal (project view, approve, revisi)"
```

---

### Task 10: Invoice Module (Draft→Sent→Paid) + PDF Signed URL

**Files:**
- Create: `modules/finance/schema.ts`, `modules/finance/service.ts`, `modules/finance/actions.ts`, `app/(dashboard)/finance/*`, `app/api/invoices/[id]/pdf/route.ts`, `__tests__/invoice.test.ts`
- Modify: `lib/db.ts`
- Test: `__tests__/invoice.test.ts`

**Interfaces:**
- Consumes: Tasks 2,8,9
- Produces: `finance/service.ts` exports `generateDraft(projectId)` (by Finance AI via 9Router), `approveInvoice(id)` (Owner), `markPaid(id)`; `/finance` list + detail; `/api/invoices/[id]/pdf` returns 302 signed URL (expire 1h), 403 if not owner/client of project.

- [ ] **Step 1: Write failing test `__tests__/invoice.test.ts`**

```ts
it("generateDraft creates invoice status=draft", async () => {});
it("approve moves draft→sent", async () => {});
it("client cannot fetch another client's invoice pdf (403)", async () => {});
it("signed URL expires after 1h (mock time)", async () => {});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/invoice.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Implement finance service + actions + Storage PDF generation (simple HTML→PDF via `puppeteer` or template → Storage upload) + signed URL via Supabase `createSignedUrl`**

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/invoice.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add modules/finance "app/(dashboard)/finance" "app/api/invoices" __tests__/invoice.test.ts
git commit -m "feat: invoice draft→sent→paid + signed PDF"
```

---

### Task 11: Chat Module — Conversations + Messages (Project & Direct, Realtime)

**Files:**
- Create: `modules/chat/schema.ts`, `modules/chat/service.ts`, `modules/chat/actions.ts`, `app/(dashboard)/chat/*`, `app/api/chat/*`, `components/chat/*`, `__tests__/chat.test.ts`
- Test: `__tests__/chat.test.ts`

**Interfaces:**
- Consumes: Tasks 2,6,7
- Produces: `chat/service.ts` exports `getOrCreateConversation({projectId?, participantIds})`, `sendMessage(conversationId, {content, senderType})`, `listMessages(conversationId)`; UI at `/chat` (inbox) and inside `/projects/[id]` tab; WS broadcast new messages; filtered by `participantIds`.

- [ ] **Step 1: Write failing test `__tests__/chat.test.ts`**

```ts
it("project chat links to projectId, direct has null", async () => {});
it("user cannot read conversation they are not participant of (403)", async () => {});
it("new message broadcasts via WS", async () => {});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/chat.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Implement chat service + WS integration + UI (shadcn chat layout, message list, input, attachments stub)**

Persist via Prisma, emit via `lib/realtime/server`. AI staff messages go through `aiChat` (optional streaming).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/chat.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add modules/chat "app/(dashboard)/chat" "app/api/chat" components/chat __tests__/chat.test.ts
git commit -m "feat: chat conversations+messages (project & direct, WS)"
```

---

### Task 12: Organization — Roles, Proposals, HR Active Toggle (Tier 1 Config)

**Files:**
- Create: `app/(dashboard)/organization/*`, `modules/org/actions.ts`, `__tests__/org.test.ts`
- Test: `__tests__/org.test.ts`

**Interfaces:**
- Consumes: Tasks 2,7
- Produces: `/organization` pages: Roles list + Add Role form (Tier1), Divisions list + Add Division, Proposals inbox (pending division/role), HR roster table with Active/Standby toggle + desk preview. `Proposals` approve 1-click creates `Division`/`Role` + `Room` update → 3D refresh.

- [ ] **Step 1: Write failing test `__tests__/org.test.ts`**

```ts
it("add role via form creates roles row (Tier1 no deploy)", async () => {});
it("provisional proposal approve creates division + room (1-click)", async () => {});
it("toggle active creates desk (spawn), standby removes", async () => {});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/org.test.ts -v`
Expected: FAIL

- [ ] **Step 3: Implement org pages + server actions (zod validate, audit log, realtime invalidation)**

Forms: role name, division, level, systemPrompt, model, tools check, avatar, room assignment. Proposal approve: transaction creating division + role(s) + room update + project `provisionalDivisionId` migration.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/org.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/organization" modules/org __tests__/org.test.ts
git commit -m "feat: organization config — roles, proposals 1-click, HR active toggle"
```

---

### Task 13: MVP End-to-End Smoke & Hardening (Local-First Verify)

**Files:**
- Create: `e2e/mvp.spec.ts`, `scripts/verify-mvp.ts`
- Modify: all prior (polish)
- Test: `e2e/mvp.spec.ts` (Playwright)

**Interfaces:**
- Consumes: Tasks 1-12
- Produces: Fully working MVP locally: `npm run dev` → lobby 3D, create project as client, full 7-stage flow dummy, invoice, chat, proposal — all verified. `npm run build` succeeds, `npm run lint` clean.

- [ ] **Step 1: Write failing e2e `e2e/mvp.spec.ts`** — logs in as OWNER, verifies lobby loads with 3 active desks; logs in as CLIENT, creates project "Company Profile + Website", approves Gate 1 & 2, asserts tasks dispatched, QA, delivery appears in portal, approve → invoice generated → chat works.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/mvp.spec.ts`
Expected: FAIL (until prior tasks wired)

- [ ] **Step 3: Wire missing gaps, add seed for demo client, ensure local Supabase/Docker instructions in README, grace job, WS, signed URLs all work locally**

Add `scripts/seed-demo.ts` for demo client + project. Ensure `.env.example` complete. Update README with `supabase start` steps.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test e2e/mvp.spec.ts` and `npm run build`
Expected: PASS, build clean

- [ ] **Step 5: Commit**

```bash
git add e2e/mvp.spec.ts scripts/verify-mvp.ts README.md
git commit -m "test: mvp e2e smoke (local-first) + hardening"
```

---

### Task 14: Publish Prep (Fase 2 Start — Env Switch Only)

**Files:**
- Create: `docs/deployment.md`, `vercel.json` (if needed), `app/api/health/route.ts`
- Test: manual verify `npm run build` with prod env

**Interfaces:**
- Consumes: Tasks 1-13
- Produces: Deployable to Vercel: `vercel.json` or dashboard config, `docs/deployment.md` with env switch checklist (DATABASE_URL, NEXTAUTH_URL, Google redirect URI, 9Router key in Vercel Env), health check endpoint.

- [ ] **Step 1: Write doc + health check test**

- [ ] **Step 2: Implement `docs/deployment.md` + `/api/health`**

- [ ] **Step 3: Verify build with `NEXTAUTH_URL` prod mock**

- [ ] **Step 4: Commit**

```bash
git add docs/deployment.md vercel.json "app/api/health"
git commit -m "chore: publish prep — deployment guide + health check"
```

---

## Execution Notes

- Tasks 1-5 are sequential (toolchain → DB → auth → shell → 3D). Tasks 6-7 can start after 3. Tasks 8-12 depend on 6-7. Task 13 is final integration.
- Prefer native execution for speed; subagent-driven if team wants per-task review gates. **Push to GitHub after every task commit per user rule** — add `git push origin master` after each commit when remote is configured.
- Diagram: promote `docs/business-process-diagram.html` to `docs/diagrams/` if needed; keep copy in `C:\Users\aisya\.opencode\plan\` for reference.
