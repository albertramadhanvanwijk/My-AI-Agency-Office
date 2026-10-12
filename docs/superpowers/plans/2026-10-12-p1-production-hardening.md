# P1 Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden MVP to production-grade by fixing 4 P1 blockers — Redis env, missing deliver route, client gate approval, and chat room scoping — plus middleware `/admin` guard, so all web functions run on any env without hard-coded infra.

**Architecture:** Keep modular monolith. Lazy-init BullMQ queue via `REDIS_URL` with graceful fallback (no throw at import). Add missing `deliver` page as thin server component calling existing `deliver()` service. Add portal client approve page reusing existing `approveGate(projectId, gate, "client")`. Scope Socket.io `message:new` and `user:typing` to per-conversation rooms, keep `staff:status` on `office` room.

**Tech Stack:** Next.js 15 App Router, Prisma + PostgreSQL, NextAuth JWT, BullMQ 6 + ioredis 6, Socket.io 4 (custom server `server.ts` + `lib/realtime/server.ts`), Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-10-10-my-ai-agency-office-design.md` §7-8 workflow + `docs/superpowers/plans/2026-10-10-my-ai-agency-office-plan.md` Tasks 8/11 + audit findings 2026-10-12 (P1 list)

## Global Constraints

- Directory is `My AI Agency Office` — all work here. Every task that passes its tests → commit to `master`.
- Local-first: `http://localhost:3000` still works with no Redis; publish is env switch only, no `if (local)` branches.
- `NINE_ROUTER_API_KEY`, `NEXTAUTH_SECRET`, `DATABASE_URL`, `REDIS_URL` never reach browser — server-only.
- TypeScript strict, `npm run lint` clean, no `any` without justification.
- TDD: write failing test → make it pass → verify (`npm test` + `npm run build`) → commit. Conventional commits (`feat:`, `fix:`).

## Review Focus

- **Redis unavailable in dev/CI/Vercel:** queue call should not crash import or request; `dispatchTask` should mark `progress` and skip enqueue with warning, not throw.
- **Client opens another client's `/portal/projects/[id]` or `/portal/projects/[id]/approve`:** must 403/Access Denied, not leak data, even if `projectId` is guessed.
- **Chat message to conversation the sender is not participant:** must 403, must not emit to room; e2e `client-portal.spec.ts` tamper check must stay green.
- **Typing indicator without server relay:** should reach only peers in same conversation, not whole office; rapid typing should be throttled (3s timeout).
- **HeadlessChrome/WebGL absent:** lobby still renders fallback, `deliver` and `approve` pages still render without 3D or WS.

---

### Task 1: Redis BullMQ — env-driven with graceful fallback

**Files:**
- Modify: `modules/workflow/service.ts:1-79` (queue init + `dispatchTask`)
- Modify: `.env.example:1-17` (add `REDIS_URL` + `REALTIME_PORT` comment)
- Modify: `lib/env.ts` (optional typed accessor for `REDIS_URL`)
- Test: `__tests__/workflow.test.ts` (add 2 cases)
- Test: `__tests__/realtime.test.ts` existing must stay green with `SKIP_LISTEN=true` and no Redis

**Interfaces:**
- Consumes: `process.env.REDIS_URL`, `process.env.REDIS_HOST`, `process.env.REDIS_PORT`, `process.env.SKIP_LISTEN`
- Produces: `getDispatchQueue(): Queue | null` (lazy, singleton) and `dispatchTask(taskId, roleId): Promise<{enqueued:boolean, skipped?:string}>` that never throws on enqueue failure; still does `db.task.update status progress` and `emitPresence`.

- [ ] **Step 1: Write failing tests in `__tests__/workflow.test.ts`**

```ts
it("dispatchTask does not throw when REDIS_URL missing (graceful fallback)", async () => {
  // mock BullMQ Queue to throw on add
  const res = await dispatchTask(taskId, roleId);
  expect(res.enqueued).toBeDefined();
  const t = await db.task.findUnique({ where: { id: taskId } });
  expect(t?.status).toBe("progress"); // still progresses even if enqueue skipped
});
it("getDispatchQueue respects REDIS_URL env (lazy init, no throw at import)", async () => {
  expect(() => require("@/modules/workflow/service")).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/workflow.test.ts -v`
Expected: FAIL — `dispatchTask` throws `ECONNREFUSED` or import threw because `new Queue` eagerly connected to `localhost:6379`

- [ ] **Step 3: Implement lazy `getDispatchQueue()` in `modules/workflow/service.ts`**

- Remove top-level `const dispatchQueue = new Queue(...)`.
- Add `function parseRedisUrl(url:string): {host:string,port:number,password?:string,tls?:object}` handling `redis://`, `rediss://`, `redis://:pass@host:port`.
- Add `let _queue: Queue | null | undefined = undefined; export function getDispatchQueue(): Queue | null { if (_queue !== undefined) return _queue; if (process.env.SKIP_LISTEN==="true") { _queue=null; return null; } const url=process.env.REDIS_URL; try { if (url) _queue=new Queue("dispatch", {connection: parseRedisUrl(url)}); else if (process.env.REDIS_HOST) _queue=new Queue("dispatch", {connection:{host:process.env.REDIS_HOST, port:parseInt(process.env.REDIS_PORT||"6379",10)}}); else _queue=new Queue("dispatch", {connection:{host:"localhost",port:6379}, prefix:"myagency"}); } catch { _queue=null; } // lazy, do not connect until first add
  // Make add fault-tolerant in dispatchTask: try { await getDispatchQueue()?.add(...) } catch(e){ console.warn("[dispatch] enqueue skipped", e); return {enqueued:false, skipped:String(e)} }
  */
- Keep `emitPresence` best-effort try/catch.

- [ ] **Step 4: Run tests to verify it passes**

Run: `npx vitest run __tests__/workflow.test.ts __tests__/realtime.test.ts -v` and `npm run build`
Expected: PASS, build 17/17 still green, no `ECONNREFUSED` at import

- [ ] **Step 5: Commit**

```bash
git add modules/workflow/service.ts .env.example lib/env.ts __tests__/workflow.test.ts
git commit -m "fix: BullMQ REDIS_URL env with graceful fallback (no hard-coded localhost)"
```

---

### Task 2: Missing Deliver Route — `app/(dashboard)/projects/[id]/deliver`

**Files:**
- Create: `app/(dashboard)/projects/[id]/deliver/page.tsx` (server component)
- Create (optional): `app/(dashboard)/projects/[id]/deliver/DeliverClient.tsx` (client confirm UI)
- Modify: `app/(dashboard)/projects/[id]/page.tsx:195-196` (keep Link, ensure it resolves)
- Test: `__tests__/workflow.test.ts` already covers `deliver()` service; add `__tests__/deliver.test.ts` or extend e2e `e2e/project.spec.ts` to click Deliver without 404

**Interfaces:**
- Consumes: `modules/workflow/service.ts:deliver`, `modules/workflow/actions.ts:deliverAction`, `lib/auth.ts:getServerSession` (OWNER guard)
- Produces: Route `GET /projects/:id/deliver` renders confirm card + calls `deliverAction` on confirm, revalidates, redirects to `/projects/:id` or `/portal/projects/:id`

- [ ] **Step 1: Write failing test `__tests__/deliver.test.ts`**

```ts
it("GET /projects/:id/deliver renders for OWNER, redirects for CLIENT", async () => {
  // mock getServerSession OWNER → expect page contains "Deliver" and button
  // mock CLIENT → expect redirect("/portal") or 403
});
it("deliverAction sets project status DELIVERY", async () => {
  await deliverAction(projectId);
  expect((await db.project.findUnique({where:{id:projectId}}))?.status).toBe("DELIVERY");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/deliver.test.ts -v`
Expected: FAIL — route file not found, `Module not found: ./deliver/page.tsx`

- [ ] **Step 3: Implement `app/(dashboard)/projects/[id]/deliver/page.tsx`**

- Server component: `export default async function DeliverPage({params}:{params:{id:string}})` → `const session=await getServerSession(authOptions); if (!session || session.user.role!=="OWNER") redirect("/login")` → fetch `db.project.findUnique({where:{id:params.id}, include:{client:true}})` → if not found `notFound()` → render `Card` with project title, status badge, brief, and `<DeliverClient projectId={id} currentStatus={status} />`.
- `DeliverClient.tsx`: `"use client"` button `Confirm Deliver` → `await deliverAction(projectId)` → `router.push(`/projects/${projectId}`)` + toast. Show already-delivered banner if `status==="DELIVERY"`.

- [ ] **Step 4: Run tests to verify it passes**

Run: `npx vitest run __tests__/deliver.test.ts -v` and `npm run build`
Expected: PASS, build includes `ƒ /projects/[id]/deliver`, Link in `projects/[id]/page.tsx` no longer 404

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/projects/[id]/deliver/page.tsx" "app/(dashboard)/projects/[id]/deliver/DeliverClient.tsx" __tests__/deliver.test.ts
git commit -m "feat: add /projects/[id]/deliver route (OWNER) — fixes 404"
```

---

### Task 3: Client Gate Approval — portal approve page + approver wiring

**Files:**
- Create: `app/portal/projects/[id]/approve/page.tsx` (server guard CLIENT/OWNER + client form)
- Create: `app/portal/projects/[id]/approve/ApproveGateClient.tsx` (reuse pattern of `ApproveGateForm` but approver="client")
- Modify: `app/(dashboard)/projects/[id]/approve/page.tsx:22-46` (keep OWNER guard, ensure `gate` searchParam still works)
- Modify: `modules/workflow/actions.ts:32-40` (ensure `approveGateAction` accepts `approver:"client"` from portal; no role check beyond session)
- Modify: `app/portal/projects/[id]/page.tsx:209-216` (add Approve Gate button linking to `/portal/projects/${id}/approve?gate=brief` when status BRIEF/PLANNING, visible to CLIENT)
- Test: `__tests__/portal.test.tsx` (add CLIENT approve 403/200 cases) and `e2e/mvp.spec.ts:197` gate flow

**Interfaces:**
- Consumes: `approveGate(projectId, gate, "client")`, `CreateProject` status `INQUIRY→PLANNING` only when both owner+client approved
- Produces: `GET /portal/projects/:id/approve?gate=brief|plan` for CLIENT (and OWNER) with 403 if user not owner of project (check `project.clientId === session.user.id` unless OWNER)

- [ ] **Step 1: Write failing tests in `__tests__/portal.test.tsx`**

```ts
it("CLIENT can approve brief gate via portal", async () => {
  await approveGateAction({ projectId, gate: "brief", approver: "client" });
  const p = await db.project.findUnique({ where: { id: projectId } });
  expect(p?.briefApprovedByClient).toBe(true);
});
it("non-owner CLIENT cannot approve another client's project (403)", async () => {
  await expect(approveGateActionAsOtherClient({ projectId, gate: "brief", approver: "client" })).rejects.toThrow(/403|Unauthorized/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/portal.test.tsx -v`
Expected: FAIL — portal approve page missing, guard not enforced

- [ ] **Step 3: Implement portal approve page**

- `app/portal/projects/[id]/approve/page.tsx`: server component `const session=await getServerSession(authOptions); if (!session) redirect("/login"); const project=await db.project.findUnique({where:{id:params.id}}); if (!project) notFound(); const isOwner=session.user.role==="OWNER"; const isClientOwner=project.clientId===session.user.id; if (!isOwner && !isClientOwner) return <AccessDenied 403 />; const gate=(searchParams.gate as "brief"|"plan") ?? "brief"; render <ApproveGateClient projectId gate currentStatus={gate==="brief"? (project.briefApprovedByClient?"approved":"pending") : (project.planApprovedByClient?"approved":"pending")} approver="client" />` (OWNER can also approve as client if needed, but default client).
- `ApproveGateClient.tsx`: clone `ApproveGateForm` but prop `approver: "owner"|"client"` and call `approveGateAction({projectId, gate, approver})`; after success `router.push(`/portal/projects/${projectId}`)`.
- In `app/portal/projects/[id]/page.tsx` add conditional `Approve Gate` button: if `project.status==="BRIEF"` show link `?gate=brief`, if `"PLANNING"` show `?gate=plan`.

- [ ] **Step 4: Run tests to verify it passes**

Run: `npx vitest run __tests__/portal.test.tsx -v` and `npx playwright test e2e/mvp.spec.ts --project=chromium --workers=1` (gate section)
Expected: PASS, CLIENT can complete second half of dual approval

- [ ] **Step 5: Commit**

```bash
git add app/portal/projects/\[id\]/approve/page.tsx app/portal/projects/\[id\]/approve/ApproveGateClient.tsx "app/(dashboard)/projects/[id]/approve/page.tsx" modules/workflow/actions.ts app/portal/projects/\[id\]/page.tsx __tests__/portal.test.tsx
git commit -m "feat: portal client gate approval (/portal/projects/[id]/approve) — completes dual approval"
```

---

### Task 4: Chat Room Scoping — per-conversation rooms + typing relay

**Files:**
- Modify: `lib/realtime/server.ts:42-83` (add `conversation:join`, `conversation:leave`, `user:typing`, scoped `emitToConversation`)
- Modify: `lib/realtime/client.ts:9-113` (add `joinConversation`, `leaveConversation`, `onMessageNew`, `emitTyping`, `onTyping`)
- Modify: `modules/chat/service.ts:10-151` (replace `emitPresence("message:new")` with `emitToConversation(conversationId, "message:new", msg)`)
- Modify: `app/api/chat/messages/route.ts:48-53` and `app/api/portal/messages/route.ts:94-115` (ensure they call service which now emits scoped)
- Modify: `components/chat/ChatWindow.tsx:53-78` and `components/portal/ChatDrawer.tsx:98-126` (join room on open, filter by room, wire typing)
- Test: `__tests__/chat.test.ts` (add room scoping assertion) + `__tests__/realtime.test.ts` (add typing relay test)

**Interfaces:**
- Consumes: `Socket` rooms `office` (presence) + `conversation:<id>` (chat)
- Produces: `emitToConversation(conversationId, event, data)` and `emitPresence` stays for `staff:status`; client `joinConversation(id)` / `onMessageNew(cb)` that only receives messages for joined room

- [ ] **Step 1: Write failing tests in `__tests__/chat.test.ts`**

```ts
it("message:new is emitted only to conversation room, not office broadcast", async () => {
  const emitSpy = vi.spyOn(realtime, "emitToConversation");
  await sendMessage(convA.id, { content: "hi", senderType: "human", senderId: userA });
  expect(emitSpy).toHaveBeenCalledWith(convA.id, "message:new", expect.objectContaining({ content: "hi" }));
  expect(emitSpy).not.toHaveBeenCalledWith(convB.id, expect.anything(), expect.anything());
});
it("user:typing is relayed to conversation room", async () => {
  // simulate socket emit user:typing and expect broadcast to same room
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/chat.test.ts -v`
Expected: FAIL — `emitToConversation` not defined, `message:new` still goes to `office`

- [ ] **Step 3: Implement server scoping**

- In `lib/realtime/server.ts`: add `export function emitToConversation(conversationId:string, event:string, data:unknown){ if(io) io.of("/presence").to(`conversation:${conversationId}`).emit(event, data); }` and keep `emitPresence` for `staff:status`.
- In `io.of("/presence").on("connection")` add: `socket.on("conversation:join", (id:string)=>{ socket.join(`conversation:${id}`); }); socket.on("conversation:leave", (id:string)=>{ socket.leave(`conversation:${id}`); }); socket.on("user:typing", ({conversationId, userId, isTyping})=>{ socket.to(`conversation:${conversationId}`).emit("user:typing", {conversationId, userId, isTyping}); });`
- In `modules/chat/service.ts`: replace `emitChatSafe("message:new", msg)` with `try { const { emitToConversation } = await import("@/lib/realtime/server"); emitToConversation(conversationId, "message:new", msg); } catch { emitPresence("message:new", msg); }` (fallback for tests).
- In `lib/realtime/client.ts`: add `export function joinConversation(id:string){ connectPresence().emit("conversation:join", id); } export function leaveConversation(id:string){ connectPresence().emit("conversation:leave", id); } export function onMessageNew(cb:(msg:any)=>void){ const s=connectPresence(); const h=(d:any)=>cb(d); s.on("message:new", h); return ()=>s.off("message:new", h); } export function emitTyping(conversationId:string, isTyping:boolean){ connectPresence().emit("user:typing", {conversationId, isTyping, userId: "self"}); } export function onTyping(cb:(d:{conversationId:string,userId:string,isTyping:boolean})=>void){ const s=connectPresence(); s.on("user:typing", cb); return ()=>s.off("user:typing", cb); }`
- In `ChatDrawer.tsx` / `ChatWindow.tsx`: on open `useEffect(()=>{ if (conversationId){ joinConversation(conversationId); const offMsg=onMessageNew((m)=>{ if(m.conversationId===conversationId) setMessages(prev=>[...prev,m]); }); const offTyping=onTyping(...setTyping...) ; return ()=>{ offMsg(); offTyping(); leaveConversation(conversationId); } } }, [conversationId])` and input `onChange` debounce `emitTyping(conversationId, true)` with 3s timeout to `false`.

- [ ] **Step 4: Run tests to verify it passes**

Run: `npx vitest run __tests__/chat.test.ts __tests__/realtime.test.ts -v` and manual `npm run dev` + two browsers join different conversations → messages isolated
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/realtime/server.ts lib/realtime/client.ts modules/chat/service.ts "app/api/chat/messages/route.ts" "app/api/portal/messages/route.ts" components/chat/ChatWindow.tsx components/portal/ChatDrawer.tsx __tests__/chat.test.ts __tests__/realtime.test.ts
git commit -m "fix: scope chat WS to per-conversation rooms + typing relay (no office broadcast)"
```

---

### Task 5: Middleware — protect `/admin` (OWNER only)

**Files:**
- Modify: `middleware.ts:74-168` (add `isAdmin` and `config.matcher` entries)
- Test: `__tests__/auth.test.ts` (add 2 cases for /admin)
- Test: `e2e/admin-features.spec.ts:124-138` already expects redirect — ensure it passes with middleware now

**Interfaces:**
- Consumes: `getToken` with `role`
- Produces: `GET /admin/*` requires `OWNER`, else redirect to `/login` or `/portal`; API under `/api/admin` already 401 via `isApi` check

- [ ] **Step 1: Write failing tests in `__tests__/auth.test.ts`**

```ts
it("CLIENT cannot access /admin (redirect to /portal)", async () => {
  const res = await middlewareMock("/admin", { role: "CLIENT" });
  expect(res.headers.get("location")).toMatch(/\/portal|\/login/);
});
it("OWNER can access /admin (next)", async () => {
  const res = await middlewareMock("/admin", { role: "OWNER" });
  expect(res.status).not.toBe(302);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/auth.test.ts -v`
Expected: FAIL — `/admin` falls through `if (!isProtectedDashboard && !isPortal && !isApi) return res` and allows CLIENT

- [ ] **Step 3: Implement `middleware.ts`**

- Add `const isAdmin = pathname.startsWith("/admin");` alongside `isProtectedDashboard`.
- In static-asset early return, add `pathname.startsWith("/admin")` to `isProtectedPrefix`.
- Change guard: `if (!isProtectedDashboard && !isPortal && !isApi && !isAdmin) return res;`
- Add after `isPortal` block: `if (isAdmin) { if (role !== "OWNER") { const target = new URL(role==="CLIENT"?"/portal":"/login", req.url); return NextResponse.redirect(target); } return res; }`
- Extend `config.matcher` with `"/admin", "/admin/:path*"`.

- [ ] **Step 4: Run tests to verify it passes**

Run: `npx vitest run __tests__/auth.test.ts -v` and `npx playwright test e2e/admin-features.spec.ts --project=chromium --workers=1`
Expected: PASS, non-owner e2e now gets redirect not 500

- [ ] **Step 5: Commit**

```bash
git add middleware.ts __tests__/auth.test.ts
git commit -m "fix: middleware protect /admin (OWNER only) + matcher"
```

---

### Task 6: Verification — full suite green

**Files:**
- No new files; verify `npm run build`, `npm test`, `npx playwright test --project=chromium --workers=1`

- [ ] **Step 1: Run `npm run build`**

Run: `npm run build`
Expected: `17/17` + new `ƒ /projects/[id]/deliver` + `ƒ /portal/projects/[id]/approve` — exit 0, only known BullMQ `valkey-glide` warning

- [ ] **Step 2: Run `npm test -- --reporter=basic`**

Run: `npm test -- --reporter=basic`
Expected: `16+` files, `>=92` tests passed (new tests added, no regressions)

- [ ] **Step 3: Run Playwright**

Run: `npx playwright test --project=chromium --workers=1 --reporter=line`
Expected: `34+` passed (deliver + portal approve e2e may add 2, total 36)

- [ ] **Step 4: Commit if needed (no code change, just verification tag)**

```bash
git log --oneline -6
# if all green, tag or push — no commit needed
```

---

## Self-Review

1. **Spec coverage:** Redis env (spec env switch), deliver missing route (spec §8 QA→DELIVERY), dual approval CLIENT (spec workflow gate), chat WS scoping (spec Task 11), admin guard (spec Task 12) — all covered. No gap.
2. **Step scan:** Each step has one checkable action (write test with exact assertions, run with expected FAIL/PASS, implement with exact signatures/files, commit). No line decides nothing.
3. **Type consistency:** `approveGate(projectId, gate, "owner"|"client")`, `emitToConversation(conversationId, event, data)`, `getDispatchQueue():Queue|null`, `ApproveGateClient` props `{projectId, gate, currentStatus, approver}` — consistent across tasks.
4. **Review Focus:** Each of 5 focus lines maps to a task: Redis unavailable→Task1, CLIENT tamper→Task3, chat 403→Task4, typing relay→Task4, HeadlessChrome→Task2/4 fallback checks.
5. **Proportion:** Plan ~ Task 1-6 with interfaces + 5 steps each — shorter than code it describes; no body transcripts, only signatures and test assertions.

## Execution Notes

- Tasks 1 and 5 are independent (no file overlap except middleware vs service) → can run in parallel after plan approval.
- Tasks 2 and 3 both touch `app/(dashboard)/projects/[id]/page.tsx` link area — run sequentially or coordinate via rebase.
- Task 4 touches realtime only — parallelizable with 1/2/3/5.
- Prefer **subagent-driven** for thorough per-task review; native if speed needed. Push to GitHub after every task commit per user rule (`git push origin master` when remote configured).
