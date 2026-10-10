# My AI Agency Office

Kantor agency generalist virtual berbasis AI — end-to-end dari perencanaan hingga delivery produk/jasa apapun. Dashboard menanam **3D Live Office Isometric Diorama Cozy Creative** (layout persis foto referensi, Level A interactivity), **Modular Monolith Next.js 15** + PostgreSQL + Prisma + Auth.js (Google OAuth) + 9Router, **local-first** (uji di `localhost:3000`, publish tinggal switch env).

> Spec lengkap: [`docs/superpowers/specs/2026-10-10-my-ai-agency-office-design.md`](docs/superpowers/specs/2026-10-10-my-ai-agency-office-design.md)
> Diagram alur bisnis: [`docs/business-process-diagram.html`](docs/business-process-diagram.html) — buka double-click di browser.

## Roadmap

- **Fase 0 (Minggu 1-2):** Persiapan — Next.js + shadcn + Prisma + Supabase + Auth.js + 9Router + Socket + prefab 3D
- **Fase 1 (Minggu 3-8) ⭐ MVP Core — Local Test:** 30 role AI (3 jaga + N active), workflow 7 stage, 3D layout foto, invoice & chat terpisah, provisional division
- **Fase 2 (Bulan 3-4):** Growth — panel admin ringan, deploy Vercel
- **Fase 3 (Bulan 5+):** Scale — extension/LT2, Vector DB, PWA

## Quick Start (akan tersedia setelah Fase 0)

```bash
npm install
cp .env.example .env.local  # isi DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_*, NINE_ROUTER_API_KEY
npx prisma migrate dev
npm run dev  # http://localhost:3000
```

## Workflow Git

Setiap task yang selesai **dan lulus uji** → commit & push ke GitHub (folder ini adalah repo).

## License

Private — My AI Agency Office.
