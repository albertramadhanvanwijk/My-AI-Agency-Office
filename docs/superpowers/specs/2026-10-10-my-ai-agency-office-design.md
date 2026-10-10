# My AI Agency Office — Design Spec

**Tanggal:** 2026-10-10
**Status:** Approved (6 Section)
**Mode:** Build
**Folder Proyek:** `My AI Agency Office` — semua pekerjaan di folder ini. Setiap task lulus uji → commit & push ke GitHub.

---

## 1. Ringkasan

**My AI Agency Office** adalah kantor agency generalist virtual berbasis AI yang melayani jasa apapun end-to-end (perencanaan → produksi → delivery). Kantor meniru struktur organisasi real (5 level hirarki, ±30 role AI + Owner human), menjalankan workflow project baku 7 stage, dan divisualisasikan sebagai **Dashboard Web App yang menanam 3D Live Office Isometric Diorama Cozy Creative** (layout persis foto referensi: gedung persegi, lobby bawah tengah, perimeter kaca, tengah cluster meja, Level A interactivity). Platform **Web App dulu** (mobile PWA Fase 3), **local-first** (uji di localhost, publish tinggal switch env).

---

## 2. Tujuan & Kriteria Sukses

**Tujuan:**
- Kombinasi otomasi operasional internal + layanan klien 24/7 + showcase wow-factor — dari perencanaan hingga delivery produk/jasa apapun.

**Kriteria Sukses MVP (Fase 1):**
- 1 project dummy "Company Profile + Website" berjalan full: Klien masuk Lobby → Resepsionis sapa → BA buat Brief → Gate 1 Approve → PM pecah WBS + gap check → Gate 2 Approve → Staff active spawn meja di 3D → Eksekusi via 9Router → QA → Delivery di Client Portal → Klien Approve/Revisi → Invoice draft→sent→paid → Feedback → Grace 48j auto-standby.
- 3D diorama render `N active` meja saja (3 jaga + N project), ruang fleksibel cozy.
- Auth Google OAuth + Credentials berfungsi, guard OWNER vs CLIENT.

---

## 3. Arsitektur & Tech Stack (Opsi A: Modular Monolith)

**Pola:** Modular Monolith Next.js — 1 codebase, terisolasi per modul Divisi via `/modules/[divisi]/`.

**Lapisan:**
```
[ Browser — Web App ]
  ├─ 3D Live Office Canvas (React Three Fiber) — di dalam Dashboard
  └─ Dashboard UI (Next.js App Router + shadcn/ui + Tailwind)

[ Next.js Server — Modular Monolith ]
  ├─ App Router (UI + Route Handlers / API)
  ├─ Module: Strategy | Creative | Tech | Marketing | Client | Finance | Admin
  ├─ AI Orchestrator (via 9Router Gateway)
  ├─ Realtime Layer (Socket.io / Pusher — presence & status online)
  └─ Workflow Engine (BullMQ / Trigger.dev — antrian tugas AI)

[ Data Layer ]
  ├─ PostgreSQL (Supabase local/Docker untuk MVP, cloud saat publish) + Prisma ORM
  ├─ File Storage (Supabase Storage / S3 — deliverable + PDF invoice)
  └─ Vector DB opsional Fase 3 (knowledge base)

[ External ]
  └─ 9Router API (gateway multi-model — ganti model tanpa refactor)
```

**Stack:**
- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind + shadcn/ui
- 3D: React Three Fiber + Drei — Isometric Diorama, kamera top-down miring ~30° (fix), true 3D low-poly rounded
- State: Zustand | DB: PostgreSQL + Prisma | Auth: Auth.js (NextAuth) — Google OAuth + Credentials | AI: 9Router SDK + Vercel AI SDK wrapper (`lib/ai/router.ts`) | Job: BullMQ atau Trigger.dev | Deploy: Vercel (Fase 2)

**Struktur Folder:**
`/app/(dashboard)/lobby, /strategy, /creative ...` + `/modules/[nama-divisi]/actions, services, schema` + `/components/3d-office` + `/lib/ai (9router client), /lib/realtime, /lib/auth` + `/prisma`

**Durability:** Next.js + React + TS + Tailwind + Three.js = ekosistem terbesar, update terjamin (`npm update`). Prisma+Postgres mudah migrasi. 9Router ganti model masa depan tanpa refactor. Upgrade path: cabut `/modules/xxx` jadi service terpisah tanpa rewrite.

**Error & Testing:** Error boundary per modul, retry+queue untuk job AI gagal, log terpusat (`audit_logs`). Testing: unit per modul + e2e flow utama + API contract tests.

**Local vs Publish:** `.env.local` untuk local (`DATABASE_URL` lokal, `NEXTAUTH_URL=http://localhost:3000`, Google redirect `localhost`), Vercel Env untuk production — tanpa `if (local)` di kode.

---

## 4. Hirarki Staff & Orkestrasi AI (30 Roster, Active On-Demand)

**Level 1 — Pimpinan (Top Management):**
- Owner / CEO → **Anda (Human)**
- Managing Director (AI) — COO harian, wakil CEO
- Strategy Advisor (AI) — think-tank CEO

**Level 2 — Kepala Divisi (6 Heads):**
1. Head of Strategy & Planning
2. Head of Creative & Content
3. Head of Technology & Product (CTO AI)
4. Head of Marketing & Growth (CMO AI)
5. Head of Client Relations (CS & Account)
6. Head of Finance, Legal & Admin

**Level 3 — Manager (Koordinator):**
- Project Manager (orchestrator utama), Account Manager, Production Manager, Tech Lead, Marketing Lead

**Level 4 — Staff Spesialis Pelaksana:**
- Planning: Business Analyst, Researcher, Strategic Planner
- Creative: Copywriter, Graphic Designer, Video Editor, UI/UX Designer
- Tech: Web Dev, App Dev, No-Code Builder, QA Tester
- Marketing: Ads Specialist, SEO Specialist, Sosmed Specialist, Email Marketer

**Level 5 — Support & Front Office:**
- Resepsionis / Virtual Concierge, Customer Success, Finance Officer, Legal Officer, HR & Recruitment, GA/Office Admin

Total **±30 AI + Anda**. Aturan hirarki: Staff → Manager → Head → MD → CEO. Lintas divisi via PM/MD.

### 4.1 Orkestrasi AI via 9Router

- Tiap role = **AI Agent Profile** (system prompt + role context + toolset + memory). Satu gateway 9Router.
- **Model Routing:** per role bisa pakai model berbeda (Copywriter→Claude, Dev→GPT-4o/Gemini, Researcher→Perplexity). Ganti via config 9Router tanpa ubah kode. Wrapper: `lib/ai/router.ts` + Vercel AI SDK.
- **Delegation Pattern (Hirarkis):** Brief → Resepsionis/PM → Head → Staff → hasil naik ke PM untuk QA → delivery.
- **Memory & Context:** per-project thread (brief, revisi, file) + history per-klien untuk personalisasi.
- **Tools per Role:** Creative (image-gen), Tech (code sandbox), Marketing (analytics fetch), Finance (invoice gen), dll.

### 4.2 Ekstensibilitas Role (Tier 1 & 2)

- **Tier 1 — Config-Driven (90% kasus, tanpa coding):** `Dashboard → Organization → + Add Role` → isi nama, divisi, melapor ke siapa, level, system prompt, model via 9Router, tools (centang), avatar & ruangan. Simpan sebagai baris `roles` + `role_tools` → langsung muncul di 3D & Dashboard tanpa deploy. Versioned (author, timestamp, prompt version, rollback).
- **Tier 2 — Code-Driven:** butuh tool kustom unik (e-signature, crawler) → tambah 1 file `/modules/[divisi]/agents/nama-role.ts` register tool.

### 4.3 Active Model — Roster vs Active (Seat = Active On-Demand)

- **Roster (30)** — daftar lengkap di HR registry. Tidak otomatis punya meja.
- **Active (on-duty)** — sedang diaktifkan (punya project / dispatch PM / toggle manual Owner/MD). **Hanya active yang di-render mejanya** di 3D. Dot hijau online, kuning idle tapi active.
- **Standby/Inactive** — di `Dashboard → HR → Talent Pool`, tidak tampil di 3D. Aktifkan 1 klik → meja spawn animasi di ruang fleksibel.

**MVP Active Policy:**
- **Idle (tanpa project): 3 jaga tetap** — Resepsionis + MD + PM (jaga lobby, sambut klien). Sisanya standby. Alternatif 0 jaga ditolak — lobby harus ada yang sapa.
- **Project masuk:** PM analisis brief → activate N staff sesuai WBS → meja spawn di ruang fleksibel. Total tampil **3 + N**.
- **Project selesai:** grace **48 jam** (config 24-72j) tetap active untuk revisi, lalu auto-standby (meja fade-out, ruang kembali fleksibel + tanaman). Owner/MD bisa **pin Active** manual.
- Biaya 9Router & WS hanya untuk active.

---

## 5. Workflow Project End-to-End (7 Stage)

**Prinsip:** Satu alur baku untuk semua jenis jasa. Bedanya hanya tim AI mana yang di-dispatch PM.

```
[1] INQUIRY — Resepsionis / Concierge (AI)
    Klien masuk via Lobby 3D → sapa → gali kebutuhan → buat Lead
    ↓
[2] BRIEF & DISCOVERY — Account Manager + BA (AI)
    Interview lanjutan → Brief + Scope + Budget awal → Gate 1
    ↓ Gate 1: APPROVAL Owner + Klien (Approve di Dashboard/Portal; revisi → balik 2)
[3] PLANNING — PM + Head Strategy + Researcher (AI)
    PM pecah Brief jadi WBS → assign ke Head divisi terkait
    Gap Check: divisi belum ada → Provisional (jalan di ruang meeting virtual) + Proposal 1-klik ke Owner
    Output: Timeline, Kanban, Estimasi → Gate 2
    ↓ Gate 2: APPROVAL Owner + Klien (Approve; revisi → balik 3)
[4] EXECUTION — Head → Manager → Staff (AI via 9Router)
    PM dispatch task paralel (enqueue Job BullMQ) → agent via 9Router pakai tools-nya
    Activate on-demand: meja spawn di 3D. Status: To Do → In Progress → Review
    ↓
[5] QA & CONSOLIDATION — Manager + Head (AI)
    Hasil Staff dicek Manager/Head → lolos → PM final QA lintas divisi
    ↓
[6] DELIVERY — PM (AI)
    Rangkum deliverable di Client Portal → Klien: Approve → 7 | Revisi → balik 4 (max revisi conf.)
    ↓
[7] CLOSING — Finance + Admin (AI)
    Finance generate Invoice (draft→sent→paid, PDF signed URL), Admin arsip + feedback
    Project → Portfolio & Knowledge Base. Grace 48j → auto-standby.
```

**PM sebagai Otak:** akses registry role & kapasitas, `dispatch(task, targetRole)` → enqueue → eksekusi via 9Router. Satu pintu untuk klien & Owner: Kanban + Timeline + Log aktivitas ("Designer merevisi logo v2"). Staff gagal → retry 2x → eskalasi Head → notifikasi PM.

**Human-in-the-Loop:** Owner takeover chat, edit brief, re-assign, pause project, ganti model per-role via 9Router kapan saja. Klien hanya Client Portal (brief, progress, deliverable, revisi).

**Tracking & Notifikasi:** Realtime WS (status task, presence di 3D, komentar baru). Notifikasi in-app + email (Fase 2). Audit trail: `who (AI role), action, targetId, modelUsed, timestamp`.

### 5.1 Ketentuan Divisi Belum Ada tapi Project Masuk (Provisional Opsi C — Hybrid)

Deteksi PM via Capability Matrix:
- Divisi ada & staff ada → activate & dispatch (normal)
- Divisi ada tapi staff kurang → activate standby / propose role baru
- Divisi BELUM ADA → Gap Handling Opsi C:

1. Project **tidak ditahan** — PM tetapkan **Divisi Provisional** sementara (jatuh ke divisi terdekat). Contoh: "Desain Arsitektur Rumah" → provisional Creative (UI/UX+Designer) sambil generate **Division Proposal**.
2. Proposal di `Dashboard → Organization → Proposals`: butuh Divisi "Architecture": 3 role (Architect, Drafter, 3D Visualizer), seat 3, ruangan saran: pecah Meeting Atas #2. Owner **Approve 1 klik** (Tier 1) → ruangan & seat & role aktif → migrasi mulus ke divisi baru. Reject → tetap di provisional.
3. Layout: provisional pakai **ruang meeting atas / ruang fleksibel** sebagai base sementara. Project 1-2 virtual, project 3+ atau approve permanen → alokasi perimeter permanen (infill pecah ruangan). Semua config-driven: `divisions` + `rooms.divisionId`.

Aturan layout divisi baru: 1-2 project virtual di meeting, 3+ atau approved → infill perimeter. Tidak pernah menolak jasa.

---

## 6. Dashboard + 3D Live Office (Isometric Diorama Cozy Creative — Layout Foto)

**Konsep Integrated:** Dashboard frame utama, 3D Live canvas di dalamnya (60-70% layar). Sidebar kiri daftar Divisi + Org Chart. Header status kantor (online staff, project aktif). Main area Canvas 3D + drawer kanan saat klik ruangan/staff (daftar staff, Chat, Assign Task).

**Gaya Visual Terkunci:** Isometric Diorama (true 3D low-poly rounded via React Three Fiber + Drei, kamera fix top-down miring ~30° seperti foto referensi, 1 angle, tidak orbit bebas — ringan, future-proof; upgrade ke Full 3D/VR tinggal buka kunci kamera tanpa ganti engine). Palette **Cozy Creative**: kayu hangat + kaca + warm light + tanaman.

**Layout Terkunci — Sesuai Foto Referensi (Gedung Persegi):**
- **Bawah tengah:** Lobby + Resepsionis + MD — 2 pintu kaca masuk, tanaman kiri-kanan, meja resepsionis kayu.
- **Kiri (4 ruang kaca vertikal):** Strategy (atas, Head+Analyst) → Creative Studio → Meeting Kecil → Client Lounge (sofa hijau, pojok bawah).
- **Kanan (4 ruang kaca vertikal):** Finance & Admin (atas) → Tech Lab → Marketing → Meeting Besar/Pantry (bawah).
- **Atas (3 ruang besar horizontal):** Board Room / War Room / Executive Meeting — lintas divisi.
- **Tengah (open plan):** max 16 cluster × 4 meja (64 seat) dengan sekat tanaman hijau di bawah tiap cluster seperti foto. **Yang di-render hanya N active** — sisanya ruang fleksibel (lantai polish + tanaman + dekor cozy, tidak mangkrak).
- **Amenity sejak hari 1 (3):** Pantry/Cafeteria (pojok kanan bawah, kitchen di foto) + Musholla (tenang dekat lobby) + Break/Game Room (pojok kiri bawah, sofa hijau). Tipe `amenity` (kayu terang + icon ☕🕌🎮), tidak punya Head, hanya status `break`/`away`.

**Interaksi Level A:** Avatar chibi low-poly, idle halus, dot hijau online / abu standby / kuning break, nameplate + jabatan + "sedang mengerjakan Logo v2". Klik avatar → drawer chat. Klik ruangan perimeter → filter staff divisi itu. Klik cluster tengah → lihat penghuni.

**Responsive:** Desktop 3D penuh, mobile/tablet fallback list/top-down static ringan.

**Scalability Layout (Phased Growth — Rekomendasi):**
- **Fase 1 — MVP: Gedung statis, kode modular.** Denah foto jadi JSON `rooms(id, type, divisionId, x,y,w,h, capacity)` + `desks(id, clusterId, staffId?)` + prefab R3F (Ruangan Kaca, Cluster 4 Meja + Sekat, Lobby). Tidak ada editor drag-drop di MVP (YAGNI), tapi tambah ruangan/cluster hanya edit 1 baris JSON (5 menit).
- **Fase 2 — Saat 30→64 staff / +2-3 divisi:** `infill` pecah 1 ruang meeting jadi 2 (sekat kaca tengah), tambah cluster di ruang fleksibel (4×4 → 5×4 → 5×5), Panel Admin ringan `Organization → Layout` (form ganti label, toggle active, tambah role Tier 1 — tanpa drag-drop bebas), analytics biaya 9Router.
- **Fase 3 — Sesak (65+ staff / >8 divisi):** Extension sayap gedung / Lantai 2 prefab (switch LT 1/2 di Dashboard), Vertical — Tier 2.
- Seat selalu **active-driven**: `desks WHERE staff.status='active'`. Ruang fleksibel terisi tanaman/dekor saat kosong. Design token Cozy tetap. Koridor dijaga (+10% lebar per 4 cluster baru).

---

## 7. Data Layer

**12 Tabel (PostgreSQL + Prisma):**

| # | Tabel | Kolom Kunci | Keterangan |
|---|-------|-------------|------------|
| 1 | `users` | id, email, passwordHash, role(OWNER|CLIENT), name, avatar, emailVerified | Human only. OWNER=Anda |
| 2 | `divisions` | id, name, color, icon, status(active|provisional|archived) | provisional untuk titipan |
| 3 | `roles` | id, divisionId, level, title, systemPrompt, modelVia9Router, tools[] | Agent profile |
| 4 | `staff` | id, roleId, name, avatar, status(active|standby|break), deskId | Roster 30, active punya deskId |
| 5 | `rooms` | id, type(lobby|division|meeting|amenity), divisionId, x,y,w,h, capacity, floor | Prefab posisi |
| 6 | `desks` | id, clusterId/roomId, staffId nullable | Hanya render jika staff active |
| 7 | `clients` | id, userId, company, contact | 1 user = 1 portal |
| 8 | `projects` | id, clientId, title, brief, status(7 stage), provisionalDivisionId, divisionIds[], timeline, budget | Lifecycle 7 stage |
| 9 | `tasks` | id, projectId, assigneeStaffId, stage, status(todo|progress|review|done), payload, resultAssetUrl | Work item |
| 10 | `proposals` | id, type(division|role|room), triggerProjectId, payload(json), status(pending|approved|rejected) | Untuk divisi baru Opsi C |
| 11 | `audit_logs` | id, who, action, targetId, modelUsed, tokens, timestamp | Biaya & jejak |
| 12 | `invoices` | id, projectId, clientId, number, items(json), amount, status(draft|sent|paid|overdue|cancelled), dueDate, pdfUrl, generatedBy, approvedBy | Terpisah dari projects |
| 13 | `conversations` | id, projectId nullable, type(project|direct), participantIds[], title, status(open|archived) | — |
| 14 | `messages` | id, conversationId, senderType(human|ai_staff), senderId, content, attachments[], modelVia9Router, createdAt | Persist, searchable, WS |

*Catatan: conversations+messages dihitung sebagai 1 domain Chat terpisah. Total domain tabel 12 + 2 tabel chat = 14 tabel fisik.*

Tambahan:
- `role_tools`, `division_capabilities` (Capability Matrix untuk gap check) — join tables.
- File deliverable & PDF invoice di **Supabase Storage / S3**, `tasks.resultAssetUrl` dan `invoices.pdfUrl` sebagai pointer.
- Vector DB Fase 3 (knowledge base).

**Storage:** Enkripsi at-rest, signed URL invoice (expire 1 jam).

---

## 8. Auth & Hak Akses

- **Auth.js (NextAuth):** provider `Google (OAuth)` + `Credentials (email/password)` — 1 session JWT. OWNER & CLIENT bisa login via Google 1 klik; fallback credentials. Google pertama kali → auto-create `users+clients` dengan `emailVerified:true`; jika email sudah OWNER → mapping ke OWNER. Opsional 2FA TOTP untuk Owner.
- **Roles:**
  - **OWNER (Anda):** full — Dashboard + 3D + HR/Org + Keuangan + semua Client Portal + approve proposal + toggle active + ganti model 9Router.
  - **CLIENT:** hanya Client Portal miliknya — brief, progress Kanban, deliverable, revisi, invoice, approve delivery. Tidak lihat HR/keuangan/project lain. Register via invite / OTP email / Google OAuth.
- **AI Staff:** tidak punya login; agent server-side via `lib/ai/router.ts`.
- **Guard 2 Lapis:** Middleware Next.js (cek session+role sebelum render) + API Route (cek `session.user.role` per request).
- **Chat/Authz:** `messages` filter by `conversation.participantIds` — user hanya lihat conversation yang ia ikuti.

---

## 9. Keamanan

- **9Router API Key NEVER ke browser** — hanya `env` server, via `lib/ai/router.ts` (Route Handler proxy `/api/ai/*`).
- **Rate limit** per client & project (mis. 30 req/menit) via Upstash/Redis.
- **Token & cost logging** ke `audit_logs` (model, tokens, cost) untuk kontrol bulanan.
- **Retry & Queue:** job gagal retry 2× (BullMQ), gagal lagi → dead-letter untuk MD review.
- **Invoice:** Storage signed URL (1 jam), filter by `clientId`.
- **Chat:** filter by participantIds, WS auth via session.
- **Backup & Enkripsi:** Postgres daily backup (Supabase managed), Storage enkripsi at-rest, secret di Vercel Env. Local: Docker volume backup, `.env*` gitignore.
- **Error Boundary** per modul Divisi.

---

## 10. Deployment — Local-First, Publish-Ready

- **MVP di local (`localhost:3000`):** `next dev` + Supabase local (Docker `supabase start`) atau Supabase cloud free tier dengan RLS ketat. `.env.local` berisi local `DATABASE_URL`, `NEXTAUTH_URL=http://localhost:3000`, Google OAuth redirect `http://localhost:3000/api/auth/callback/google` (daftarkan di Google Cloud Console).
- **Publish (Fase 2):** ganti env di Vercel: `DATABASE_URL` (cloud), `NEXTAUTH_URL=https://domain.com`, tambah redirect URI Google `https://domain.com/api/auth/callback/google` (dua URI bisa aktif bersamaan). **Tanpa refactor.** 9Router key tetap server-only di Vercel Env. Domain + SSL di Vercel.
- **No `if (local)` branches** di kode.

---

## 11. Alur Bisnis — Diagram Mapping

- **File:** `C:\Users\aisya\.opencode\plan\business-process-diagram.html` (interaktif, buka double-click di browser) — akan dipindah ke `docs/superpowers/diagrams/` di implementasi.
- **Salinan:** `business-process-diagram.html` juga tersedia via plan folder.
- Isi: 7-stage horizontal flow (Inquiry → Brief → Gate1 → Planning+GapCheck+Proposal → Gate2 → Execution (3+N) → QA → Delivery→Revisi loop → Closing 48j) + lane Seat=Active On-Demand (Idle 3 → N project → Grace → Standby) + chat/invoice notes + legend Human/AI/System/Gate.

---

## 12. Roadmap Fase Pengembangan

**Fase 0 — Persiapan (Minggu 1-2):**
Setup Next.js 15 + shadcn + Tailwind + Prisma + Supabase (DB+Storage) + Auth.js (Google OAuth) + 9Router gateway + Socket realtime + BullMQ. Prefab 3D (Ruangan Kaca, Cluster 4 Meja+Sakat, Lobby) via R3F. Denah foto → JSON `rooms+desks` statis + roster 30 seed + capability matrix. `.env.local` vs production.

**Fase 1 — MVP Core (Minggu 3-8) ⭐ Target Rilis Awal — Local Test:**
Hirarki 30 + active on-demand (3 jaga + N project, grace 48j) + Isometric Cozy Creative layout foto (seat=active, 3 amenity) + Workflow 7 stage + PM dispatch + Kanban + Portal (brief→delivery→revisi) + Invoice draft→sent→paid + Chat terpisah + Proposal Provisional Opsi C + Google OAuth guard. Kriteria lulus: 1 project dummy full end-to-end.

**Fase 2 — Growth (Bulan 3-4) — Siap Publish:**
Panel Admin `Organization→Layout` ringan (ganti label, toggle active, tambah role Tier 1 form) + infill pecah ruangan + tambah cluster di ruang fleksibel + analytics biaya 9Router. Deploy ke Vercel+Supabase cloud (env switch).

**Fase 3 — Scale (Bulan 5+):**
Extension sayap / Lantai 2 (prefab Tier 2, switch LT1/2) + Vector DB knowledge base + Mobile PWA + billing automation + laporan keuangan + upgrade 3D ke orbit bebas/VR (buka kunci kamera).

**Estimasi:** MVP 2 bulan dengan 1-2 dev. Stack menjamin update zaman tinggal `npm update` & ganti model di gateway.

---

## 13. Keputusan Terkunci

| Topik | Keputusan |
|-------|-----------|
| Agency | Generalist full-service, end-to-end |
| Struktur | 5 level, 30 AI + Owner human, 6 divisi |
| Role baru | Tier 1 config 1-klik, Tier 2 code-driven |
| Divisi belum ada | Provisional + Proposal 1-klik (Opsi C), virtual dulu |
| Seat | Active on-demand: 3 jaga idle, N project active, grace 48j |
| Arsitektur | Opsi A Modular Monolith Next.js 15 + R3F |
| 3D Style | Isometric Diorama Cozy Creative (kayu+kaca+tanaman) |
| Layout | Persis foto referensi (persegi, lobby bawah, 4+4+3 perimeter, 16 cluster max) |
| 3D Interactivity | Level A (klik chat, dot hijau) |
| Amenity | Pantry + Musholla + Break/Game sejak hari 1 |
| Scalability | Fase 1 statis+kode modular, Fase 2 infill+panel ringan, Fase 3 extension/LT2 |
| DB | 12 domain (14 tabel) + Storage + Vector Fase 3 |
| Auth | Google OAuth + Credentials (Auth.js), 2 roles |
| Invoice/Chat | Tabel terpisah, signed URL, WS realtime |
| Deployment | Local-first (localhost), publish-ready (Vercel env switch) |
| Workflow Push | Setiap task lulus uji → commit & push ke GitHub, di folder ini |
| Diagram | business-process-diagram.html |

---

## 14. Non-Goals (MVP)

- Full 3D orbit bebas / VR (Fase 3)
- Editor drag-drop layout gedung (Fase 2 ringan)
- Mobile App native (PWA Fase 3)
- Video-call di dalam 3D (Level A saja)

---

## 15. Open Questions (Resolved)

Semua section telah di-approve. Tidak ada open question tersisa untuk design phase. Detail implementasi (model 9Router per role, max revisi default, grace 24/48/72) akan diputuskan di implementation plan dan dikonfigurasi via env/config.

---

*Spec ini adalah source of truth untuk implementation plan. Perubahan setelah ini via amendment section.*
