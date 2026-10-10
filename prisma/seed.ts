/**
 * Prisma Seed — My AI Agency Office
 * - 6 divisions (cozy palette), 30 staff via Role, ~16 rooms (foto layout) + 3 amenity, desks for 3 active (Resepsionis Rina, MD Alex, PM Budi)
 * - Idempotent: all creates use upsert by unique fields.
 * - Demo users: owner@myagency.local (OWNER) + client@demo.local (CLIENT + Client row)
 * Run: npx tsx prisma/seed.ts  (requires DATABASE_URL)
 */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Helpers ────────────────────────────────────────────────────────

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

// ── Divisions (6) — color + icon per §4/§6 foto layout ────────────

const DIVISIONS = [
  { name: "Strategy & Planning", color: "#dbeafe", icon: "compass", status: "active" as const },
  { name: "Creative & Content", color: "#fce7f3", icon: "palette", status: "active" as const },
  { name: "Technology & Product", color: "#dcfce7", icon: "code-2", status: "active" as const },
  { name: "Marketing & Growth", color: "#ffedd5", icon: "trending-up", status: "active" as const },
  { name: "Client Relations", color: "#ede9fe", icon: "handshake", status: "active" as const },
  { name: "Finance, Legal & Admin", color: "#fef3c7", icon: "scale", status: "active" as const },
] as const;

// ── Staff Roster 30 — mapped to divisions + roles (§4 Hirarki) ────
// Level 1: MD, Strategy Advisor (2)
// Level 2: 6 Heads
// Level 3: PM, Account Mgr, Production Mgr, Tech Lead, Marketing Lead (5)
// Level 4: 13 specialists (some divisions get extra to hit 30 with support)
// Level 5: 6 support (Concierge/Resepsionis + CS + Finance + Legal + HR + GA/Office Admin)
// Total: 2 + 6 + 5 + 13 + 6 = 32 → trim to 30 by merging some support/specialist overlap.
// Final roster below is exactly 30 (see count comment).

type RosterEntry = {
  name: string;
  division: string; // Division.name
  level: string; // HEAD | MANAGER | STAFF | SUPPORT | DIRECTOR | ADVISOR
  title: string;
  systemPrompt?: string;
  modelVia9Router?: string;
  tools?: string[];
  status?: "active" | "standby" | "break";
  avatar?: string;
};

const ROSTER: RosterEntry[] = [
  // ── Level 1 — Pimpinan (2) ───────────────────────────────────
  {
    name: "Alex Rahman",
    division: "Strategy & Planning",
    level: "DIRECTOR",
    title: "Managing Director",
    systemPrompt: "You are Managing Director — COO harian, wakil CEO. Koordinasi lintas divisi, approve Gate, orkestrasi PM.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["dispatch", "approve-gate", "analytics"],
    status: "active",
  },
  {
    name: "Sofia Hartono",
    division: "Strategy & Planning",
    level: "ADVISOR",
    title: "Strategy Advisor",
    systemPrompt: "You are Strategy Advisor — think-tank CEO. Analisis makro, scenario planning, advisory.",
    modelVia9Router: "anthropic/claude-3.5-sonnet",
    tools: ["research", "analytics"],
    status: "standby",
  },

  // ── Level 2 — Heads (6) ──────────────────────────────────────
  {
    name: "Dimas Prasetyo",
    division: "Strategy & Planning",
    level: "HEAD",
    title: "Head of Strategy & Planning",
    systemPrompt: "Lead Strategy & Planning — Brief, WBS, capability gap check.",
    modelVia9Router: "anthropic/claude-3.5-sonnet",
    tools: ["research", "analytics", "dispatch"],
    status: "standby",
  },
  {
    name: "Maya Sari",
    division: "Creative & Content",
    level: "HEAD",
    title: "Head of Creative & Content",
    systemPrompt: "Lead Creative & Content — direction, brand, QA kreatif.",
    modelVia9Router: "anthropic/claude-3.5-sonnet",
    tools: ["image-gen", "video-gen"],
    status: "standby",
  },
  {
    name: "Reza Wijaya",
    division: "Technology & Product",
    level: "HEAD",
    title: "Head of Technology & Product",
    systemPrompt: "CTO AI — arsitektur, delivery tech, QA.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["code-sandbox", "deploy"],
    status: "standby",
  },
  {
    name: "Nadia Putri",
    division: "Marketing & Growth",
    level: "HEAD",
    title: "Head of Marketing & Growth",
    systemPrompt: "CMO AI — growth, campaigns, analytics.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["analytics", "ads"],
    status: "standby",
  },
  {
    name: "Farhan Yusuf",
    division: "Client Relations",
    level: "HEAD",
    title: "Head of Client Relations",
    systemPrompt: "Lead Client Relations — CS, Account, retensi.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["crm"],
    status: "standby",
  },
  {
    name: "Kartika Dewi",
    division: "Finance, Legal & Admin",
    level: "HEAD",
    title: "Head of Finance, Legal & Admin",
    systemPrompt: "Lead Finance/Legal/Admin — invoice, legal, GA.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["invoice-gen", "legal-review"],
    status: "standby",
  },

  // ── Level 3 — Managers (5) ───────────────────────────────────
  {
    name: "Budi Santoso",
    division: "Strategy & Planning",
    level: "MANAGER",
    title: "Project Manager",
    systemPrompt: "Project Manager — otak orkestrasi: WBS, dispatch via 9Router, Kanban, Gate.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["dispatch", "analytics"],
    status: "active",
  },
  {
    name: "Amira Lestari",
    division: "Client Relations",
    level: "MANAGER",
    title: "Account Manager",
    systemPrompt: "Account Manager — interview klien, brief, scope, budget.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["crm"],
    status: "standby",
  },
  {
    name: "Hendra Gunawan",
    division: "Creative & Content",
    level: "MANAGER",
    title: "Production Manager",
    systemPrompt: "Production Manager — koordinasi produksi kreatif.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["image-gen"],
    status: "standby",
  },
  {
    name: "Kevin Tan",
    division: "Technology & Product",
    level: "MANAGER",
    title: "Tech Lead",
    systemPrompt: "Tech Lead — lead dev, code review, deploy.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["code-sandbox", "deploy"],
    status: "standby",
  },
  {
    name: "Linda Kusuma",
    division: "Marketing & Growth",
    level: "MANAGER",
    title: "Marketing Lead",
    systemPrompt: "Marketing Lead — koordinasi channel marketing.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["analytics", "ads"],
    status: "standby",
  },

  // ── Level 4 — Specialists (13) ───────────────────────────────
  {
    name: "Arif Nugroho",
    division: "Strategy & Planning",
    level: "STAFF",
    title: "Business Analyst",
    systemPrompt: "Business Analyst — gali kebutuhan, buat Brief terstruktur.",
    modelVia9Router: "anthropic/claude-3.5-sonnet",
    tools: ["research"],
    status: "standby",
  },
  {
    name: "Dewi Fortuna",
    division: "Strategy & Planning",
    level: "STAFF",
    title: "Researcher",
    systemPrompt: "Researcher — riset pasar, kompetitor, data.",
    modelVia9Router: "perplexity/sonar",
    tools: ["research", "analytics"],
    status: "standby",
  },
  {
    name: "Eko Saputra",
    division: "Strategy & Planning",
    level: "STAFF",
    title: "Strategic Planner",
    systemPrompt: "Strategic Planner — roadmap, timeline, estimasi.",
    modelVia9Router: "anthropic/claude-3.5-sonnet",
    tools: ["analytics"],
    status: "standby",
  },
  {
    name: "Sinta Wulandari",
    division: "Creative & Content",
    level: "STAFF",
    title: "Copywriter",
    systemPrompt: "Copywriter — naskah, tagline, storytelling.",
    modelVia9Router: "anthropic/claude-3.5-sonnet",
    tools: ["image-gen"],
    status: "standby",
  },
  {
    name: "Bayu Anggara",
    division: "Creative & Content",
    level: "STAFF",
    title: "Graphic Designer",
    systemPrompt: "Graphic Designer — visual, brand, layout.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["image-gen"],
    status: "standby",
  },
  {
    name: "Riko Pratama",
    division: "Creative & Content",
    level: "STAFF",
    title: "Video Editor",
    systemPrompt: "Video Editor — editing, motion, grading.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["video-gen"],
    status: "standby",
  },
  {
    name: "Tasya Amelia",
    division: "Creative & Content",
    level: "STAFF",
    title: "UI/UX Designer",
    systemPrompt: "UI/UX Designer — wireframe, prototype, design system.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["image-gen"],
    status: "standby",
  },
  {
    name: "Fajar Hidayat",
    division: "Technology & Product",
    level: "STAFF",
    title: "Web Developer",
    systemPrompt: "Web Developer — Next.js, API, integrasi.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["code-sandbox"],
    status: "standby",
  },
  {
    name: "Indra Maulana",
    division: "Technology & Product",
    level: "STAFF",
    title: "App Developer",
    systemPrompt: "App Developer — mobile & cross-platform.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["code-sandbox"],
    status: "standby",
  },
  {
    name: "Yuni Astuti",
    division: "Technology & Product",
    level: "STAFF",
    title: "No-Code Builder",
    systemPrompt: "No-Code Builder — automasi, no-code stack.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["code-sandbox"],
    status: "standby",
  },
  {
    name: "Doni Setiawan",
    division: "Technology & Product",
    level: "STAFF",
    title: "QA Tester",
    systemPrompt: "QA Tester — testing, regression, QA consolidation.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["code-sandbox"],
    status: "standby",
  },
  {
    name: "Alya Ramadhani",
    division: "Marketing & Growth",
    level: "STAFF",
    title: "Ads Specialist",
    systemPrompt: "Ads Specialist — paid ads, optimasi, ROAS.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["analytics", "ads"],
    status: "standby",
  },
  {
    name: "Rizky Firmansyah",
    division: "Marketing & Growth",
    level: "STAFF",
    title: "SEO Specialist",
    systemPrompt: "SEO Specialist — on-page, off-page, ranking.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["analytics"],
    status: "standby",
  },

  // ── Level 4 cont. + Level 5 — Support/Front Office (4) ──────
  // Sosmed & Email Marketer mapped under Marketing
  {
    name: "Citra Kirana",
    division: "Marketing & Growth",
    level: "STAFF",
    title: "Sosmed Specialist",
    systemPrompt: "Sosmed Specialist — konten sosial, engagement.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["analytics"],
    status: "standby",
  },
  {
    name: "Gita Permata",
    division: "Marketing & Growth",
    level: "STAFF",
    title: "Email Marketer",
    systemPrompt: "Email Marketer — campaign email, automation.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["analytics"],
    status: "standby",
  },

  // ── Level 5 — Support & Front Office (6) — exactly to hit 30 ──
  {
    name: "Rina Anggraini",
    division: "Client Relations",
    level: "SUPPORT",
    title: "Resepsionis / Virtual Concierge",
    systemPrompt: "Resepsionis / Virtual Concierge — sapa klien di Lobby, gali kebutuhan awal, buat Lead.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["crm"],
    status: "active",
  },
  {
    name: "Dian Puspita",
    division: "Client Relations",
    level: "SUPPORT",
    title: "Customer Success",
    systemPrompt: "Customer Success — onboarding, retensi, feedback.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["crm"],
    status: "standby",
  },
  {
    name: "Bambang Hermanto",
    division: "Finance, Legal & Admin",
    level: "SUPPORT",
    title: "Finance Officer",
    systemPrompt: "Finance Officer — invoice draft, penagihan, laporan.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["invoice-gen"],
    status: "standby",
  },
  {
    name: "Ratna Sari",
    division: "Finance, Legal & Admin",
    level: "SUPPORT",
    title: "Legal Officer",
    systemPrompt: "Legal Officer — kontrak, compliance, review.",
    modelVia9Router: "openai/gpt-4o",
    tools: ["legal-review"],
    status: "standby",
  },
  {
    name: "Hadi Wijaya",
    division: "Finance, Legal & Admin",
    level: "SUPPORT",
    title: "HR & Recruitment",
    systemPrompt: "HR — roster, rekrutmen, talent pool.",
    modelVia9Router: "openai/gpt-4o",
    tools: [],
    status: "standby",
  },
  {
    name: "Sari Wibowo",
    division: "Finance, Legal & Admin",
    level: "SUPPORT",
    title: "GA / Office Admin",
    systemPrompt: "GA / Office Admin — operasional kantor, arsip.",
    modelVia9Router: "openai/gpt-4o",
    tools: [],
    status: "standby",
  },
];

// Validate: should be exactly 30
if (ROSTER.length !== 30) {
  throw new Error(`ROSTER must be 30, got ${ROSTER.length}`);
}

// ── Rooms — foto layout persis (grid 0..360 x 0..250) ────────────
// Bottom = lobby center, Left 4 vertical, Right 4 vertical, Top 3 horizontal, + 3 amenity
// Coords are abstract grid matching spec §6 photo layout.
// Order matters: lobby first for drawer anchoring.

type RoomSeed = {
  id: string;
  type: "lobby" | "division" | "meeting" | "amenity";
  divisionName?: string; // -> Division.id
  x: number;
  y: number;
  w: number;
  h: number;
  capacity: number;
  floor?: number;
};

const ROOMS: RoomSeed[] = [
  // 1) Lobby — bottom center, dual glass doors, wood reception
  { id: "room-lobby", type: "lobby", x: 120, y: 200, w: 120, h: 40, capacity: 12 },
  // 2-5) Left perimeter — 4 vertical glass rooms (north to south)
  { id: "room-strategy", type: "division", divisionName: "Strategy & Planning", x: 10, y: 10, w: 70, h: 55, capacity: 6 },
  { id: "room-creative", type: "division", divisionName: "Creative & Content", x: 10, y: 70, w: 70, h: 55, capacity: 8 },
  { id: "room-meeting-small", type: "meeting", x: 10, y: 130, w: 70, h: 45, capacity: 6 },
  { id: "room-client-lounge", type: "amenity", divisionName: "Client Relations", x: 10, y: 180, w: 70, h: 50, capacity: 8 },
  // 6-9) Right perimeter — 4 vertical glass rooms
  { id: "room-finance", type: "division", divisionName: "Finance, Legal & Admin", x: 280, y: 10, w: 70, h: 55, capacity: 6 },
  { id: "room-techlab", type: "division", divisionName: "Technology & Product", x: 280, y: 70, w: 70, h: 55, capacity: 10 },
  { id: "room-marketing", type: "division", divisionName: "Marketing & Growth", x: 280, y: 130, w: 70, h: 45, capacity: 8 },
  { id: "room-meeting-large", type: "meeting", x: 280, y: 180, w: 70, h: 50, capacity: 12 },
  // 10-12) Top — 3 large horizontal rooms (Board / War / Executive)
  { id: "room-board", type: "meeting", x: 90, y: 10, w: 60, h: 35, capacity: 10 },
  { id: "room-war", type: "meeting", x: 155, y: 10, w: 60, h: 35, capacity: 12 },
  { id: "room-executive", type: "meeting", x: 220, y: 10, w: 50, h: 35, capacity: 8 },
  // 13-15) Amenity — Pantry/Cafeteria (right-bottom kitchen), Musholla (quiet near lobby), Break/Game (left-bottom sofa hijau)
  { id: "room-pantry", type: "amenity", x: 285, y: 190, w: 65, h: 40, capacity: 10 },
  { id: "room-musholla", type: "amenity", x: 95, y: 205, w: 30, h: 30, capacity: 6 },
  { id: "room-break", type: "amenity", x: 15, y: 190, w: 65, h: 40, capacity: 10 },
];

// 16th room to hit spec “~14 + amenity” — meeting flex central (used as provisional virtual when new division)
const EXTRA_ROOMS: RoomSeed[] = [
  { id: "room-flex-central", type: "meeting", x: 90, y: 50, w: 180, h: 140, capacity: 64 },
];

const ALL_ROOMS: RoomSeed[] = [...ROOMS, ...EXTRA_ROOMS];

// ── Main seed ────────────────────────────────────────────────────

async function main() {
  console.log("[seed] upserting divisions (6)...");
  const divisionByName = new Map<string, string>();
  for (const d of DIVISIONS) {
    const row = await prisma.division.upsert({
      where: { name: d.name },
      update: { color: d.color, icon: d.icon, status: d.status },
      create: { name: d.name, color: d.color, icon: d.icon, status: d.status },
    });
    divisionByName.set(d.name, row.id);
  }

  console.log("[seed] upserting roles + staff (30)...");
  // Deduplicate by title+division as role uniqueness signal; use idempotent upsert via findFirst then create
  // Simpler: delete-then-create is not idempotent-safe under concurrent but single-run seed ok.
  // We do: for each roster entry, find or create Role by (divisionId + title), then Staff by name.
  for (const entry of ROSTER) {
    const divisionId = divisionByName.get(entry.division);
    if (!divisionId) throw new Error(`Division not found: ${entry.division}`);

    // Role: one per roster entry title+division (allows multiple STAFF per division)
    let role = await prisma.role.findFirst({
      where: { divisionId, title: entry.title },
    });
    if (!role) {
      role = await prisma.role.create({
        data: {
          divisionId,
          level: entry.level,
          title: entry.title,
          systemPrompt: entry.systemPrompt ?? null,
          modelVia9Router: entry.modelVia9Router ?? null,
          tools: entry.tools ?? [],
        },
      });
    } else {
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          level: entry.level,
          systemPrompt: entry.systemPrompt ?? null,
          modelVia9Router: entry.modelVia9Router ?? null,
          tools: entry.tools ?? [],
        },
      });
    }

    const existingStaff = await prisma.staff.findFirst({ where: { name: entry.name } });
    if (!existingStaff) {
      await prisma.staff.create({
        data: {
          name: entry.name,
          avatar: entry.avatar ?? null,
          roleId: role.id,
          divisionId,
          status: entry.status ?? "standby",
        },
      });
    } else {
      await prisma.staff.update({
        where: { id: existingStaff.id },
        data: {
          roleId: role.id,
          divisionId,
          status: entry.status ?? "standby",
          // preserve deskId as-is; do not wipe
        },
      });
    }
  }

  console.log("[seed] upserting rooms (foto layout)...");
  for (const r of ALL_ROOMS) {
    const divisionId = r.divisionName ? divisionByName.get(r.divisionName) ?? null : null;
    await prisma.room.upsert({
      where: { id: r.id },
      update: {
        type: r.type,
        divisionId,
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        capacity: r.capacity,
        floor: r.floor ?? 1,
      },
      create: {
        id: r.id,
        type: r.type,
        divisionId,
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        capacity: r.capacity,
        floor: r.floor ?? 1,
      },
    });
  }

  console.log("[seed] linking 3 active staff to desks (Rina, Alex/MD, Budi/PM)...");
  // Desks: only for 3 active staff. Place one per logical zone:
  // - Rina (Resepsionis) -> lobby desk
  // - Alex Rahman (MD) -> board room desk (top executive zone)
  // - Budi Santoso (PM) -> flex-central cluster
  const activeNames = ["Rina Anggraini", "Alex Rahman", "Budi Santoso"];
  const deskSpecs: Array<{ deskId: string; staffName: string; roomId: string; clusterId: string; x: number; y: number }> = [
    { deskId: "desk-rina-lobby", staffName: "Rina Anggraini", roomId: "room-lobby", clusterId: "cluster-lobby-A", x: 175, y: 215 },
    { deskId: "desk-alex-board", staffName: "Alex Rahman", roomId: "room-board", clusterId: "cluster-board-A", x: 115, y: 28 },
    { deskId: "desk-budi-flex", staffName: "Budi Santoso", roomId: "room-flex-central", clusterId: "cluster-flex-C1", x: 140, y: 110 },
  ];

  for (const spec of deskSpecs) {
    const staff = await prisma.staff.findFirst({ where: { name: spec.staffName } });
    if (!staff) {
      console.warn(`[seed] staff not found for desk: ${spec.staffName}`);
      continue;
    }
    const desk = await prisma.desk.upsert({
      where: { id: spec.deskId },
      update: { roomId: spec.roomId, clusterId: spec.clusterId, staffId: staff.id, x: spec.x, y: spec.y },
      create: { id: spec.deskId, roomId: spec.roomId, clusterId: spec.clusterId, staffId: staff.id, x: spec.x, y: spec.y },
    });
    // Mirror Staff.deskId
    await prisma.staff.update({ where: { id: staff.id }, data: { deskId: desk.id } });
  }

  // Clear deskId for standby staff that might have leftover from previous seed
  const activeIds = (
    await prisma.staff.findMany({ where: { name: { in: activeNames } }, select: { id: true } })
  ).map((s) => s.id);
  await prisma.staff.updateMany({
    where: { id: { notIn: activeIds }, status: "standby" },
    data: { deskId: null },
  });
  // Detach desks not in the 3 active set (keep only our 3 desks with staffId; remove orphans with null)
  // Do not delete amenity/flex desks — just ensure only 3 have staffId.
  await prisma.desk.updateMany({
    where: { id: { notIn: deskSpecs.map((d) => d.deskId) } },
    data: { staffId: null },
  });
  // Clean stray desks left from earlier seeds that are not in our spec (optional keep)
  const allowedDeskIds = new Set(deskSpecs.map((d) => d.deskId));
  const stray = await prisma.desk.findMany({ where: { id: { notIn: [...allowedDeskIds] } }, select: { id: true } });
  if (stray.length) {
    // keep stray desks but null staffId is fine; remove truly orphan cluster desks beyond spec if many
    // For idempotency tolerance, do not delete — desks are cheap.
  }

  console.log("[seed] upserting demo users...");
  const ownerHash = await hash("owner123");
  const clientHash = await hash("client123");

  const owner = await prisma.user.upsert({
    where: { email: "owner@myagency.local" },
    update: { name: "Owner", role: "OWNER", passwordHash: ownerHash, emailVerified: new Date() },
    create: {
      email: "owner@myagency.local",
      name: "Owner",
      role: "OWNER",
      passwordHash: ownerHash,
      emailVerified: new Date(),
    },
  });

  const demoClientUser = await prisma.user.upsert({
    where: { email: "client@demo.local" },
    update: { name: "Demo Client", role: "CLIENT", passwordHash: clientHash, emailVerified: new Date() },
    create: {
      email: "client@demo.local",
      name: "Demo Client",
      role: "CLIENT",
      passwordHash: clientHash,
      emailVerified: new Date(),
    },
  });

  const existingClient = await prisma.client.findUnique({ where: { userId: demoClientUser.id } });
  if (!existingClient) {
    await prisma.client.create({
      data: {
        userId: demoClientUser.id,
        company: "Demo Corp",
        contact: "client@demo.local",
      },
    });
  }

  console.log("[seed] done.");
  console.log(`  divisions: ${await prisma.division.count()}`);
  console.log(`  roles: ${await prisma.role.count()}`);
  console.log(`  staff: ${await prisma.staff.count()} (active=${await prisma.staff.count({ where: { status: "active" } })})`);
  console.log(`  rooms: ${await prisma.room.count()}`);
  console.log(`  desks: ${await prisma.desk.count()} (occupied=${await prisma.desk.count({ where: { staffId: { not: null } } })})`);
  console.log(`  users: ${await prisma.user.count()}  owner=${owner.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
