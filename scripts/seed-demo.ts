/**
 * Seed demo client + project for E2E — idempotent via upsert
 * Creates/ensures:
 *  - User CLIENT client@demo.local + Client row + User OWNER owner@myagency.local (for E2E login tolerance)
 *  - Project INQUIRY "Company Profile + Website" owned by demo client
 * Run: npx tsx scripts/seed-demo.ts
 * Env: DATABASE_URL required (same as prisma/seed.ts)
 */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_CLIENT_EMAIL = "client@demo.local";
const DEMO_CLIENT_PASSWORD = "client123";
const OWNER_EMAIL = "owner@myagency.local";
const OWNER_PASSWORD = "owner123";
const PROJECT_TITLE = "Company Profile + Website";
const PROJECT_BRIEF =
  "Company Profile + Website — company profile 12 halaman + website Next.js responsive, CMS, SEO, bilingual ID/EN. " +
  "Scope: strategy, creative (copy + design), tech (Next.js + CMS), marketing (SEO), invoice & portal delivery.";

async function hash(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

async function main(): Promise<void> {
  console.log("[seed-demo] ensuring demo users + client + project (idempotent)...");

  const clientHash = await hash(DEMO_CLIENT_PASSWORD);
  const ownerHash = await hash(OWNER_PASSWORD);

  // 1) OWNER — keep in sync with prisma/seed.ts credentials (owner123) + E2E alt password123 tolerance
  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {
      name: "Owner",
      role: "OWNER",
      passwordHash: ownerHash,
      emailVerified: new Date(),
    },
    create: {
      email: OWNER_EMAIL,
      name: "Owner",
      role: "OWNER",
      passwordHash: ownerHash,
      emailVerified: new Date(),
    },
  });
  console.log(`[seed-demo] OWNER: ${owner.email} (${owner.id})`);

  // Also support password123 for legacy E2E owner spec — store as ownerHash but verify E2E tries both;
  // we keep DB as owner123 per main seed; E2E handles fallback so no extra DB write needed.

  // 2) CLIENT user
  const clientUser = await prisma.user.upsert({
    where: { email: DEMO_CLIENT_EMAIL },
    update: {
      name: "Demo Client",
      role: "CLIENT",
      passwordHash: clientHash,
      emailVerified: new Date(),
    },
    create: {
      email: DEMO_CLIENT_EMAIL,
      name: "Demo Client",
      role: "CLIENT",
      passwordHash: clientHash,
      emailVerified: new Date(),
    },
  });
  console.log(`[seed-demo] CLIENT user: ${clientUser.email} (${clientUser.id})`);

  // 3) Client row (1:1 with User)
  let client = await prisma.client.findUnique({ where: { userId: clientUser.id } });
  if (!client) {
    client = await prisma.client.create({
      data: {
        userId: clientUser.id,
        company: "Demo Corp",
        contact: DEMO_CLIENT_EMAIL,
        name: "Demo Client",
      },
    });
    console.log(`[seed-demo] Client row created: ${client.id}`);
  } else {
    client = await prisma.client.update({
      where: { id: client.id },
      data: {
        company: client.company ?? "Demo Corp",
        contact: client.contact ?? DEMO_CLIENT_EMAIL,
        name: client.name ?? "Demo Client",
      },
    });
    console.log(`[seed-demo] Client row ensured: ${client.id}`);
  }

  // 4) Project INQUIRY "Company Profile + Website" — idempotent by (clientId + title)
  // Use findFirst + create/update because title is not unique alone in schema.
  let project = await prisma.project.findFirst({
    where: { clientId: client.id, title: PROJECT_TITLE },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        clientId: client.id,
        title: PROJECT_TITLE,
        brief: PROJECT_BRIEF,
        status: "INQUIRY",
        divisionIds: [],
        budget: null,
      },
    });
    console.log(`[seed-demo] Project created: "${project.title}" (${project.id}) status=${project.status}`);
  } else {
    // Keep existing status/timeline intact; only ensure brief/title sensible and not accidentally archived
    project = await prisma.project.update({
      where: { id: project.id },
      data: {
        title: PROJECT_TITLE,
        brief: project.brief && project.brief.length > 20 ? project.brief : PROJECT_BRIEF,
      },
    });
    console.log(`[seed-demo] Project ensured: "${project.title}" (${project.id}) status=${project.status}`);
  }

  // 5) Optional: ensure one task exists so Kanban smoke has content (tolerant gate)
  const taskCount = await prisma.task.count({ where: { projectId: project.id } });
  if (taskCount === 0) {
    await prisma.task.create({
      data: {
        projectId: project.id,
        stage: "Planning",
        status: "todo",
        payload: { title: "Initial brief review", description: "E2E seed task — verify Kanban renders" },
      },
    });
    console.log("[seed-demo] Seed task created (todo/Planning) for Kanban smoke");
  }

  // Summary
  const divisions = await prisma.division.count();
  const staff = await prisma.staff.count();
  const active = await prisma.staff.count({ where: { status: "active" } });
  console.log("[seed-demo] done.");
  console.log(`  divisions: ${divisions}  staff: ${staff} (active=${active})`);
  console.log(`  client: ${client.id}  project: ${project.id} (“${project.title}” ${project.status})`);
  console.log(`  login: ${DEMO_CLIENT_EMAIL} / ${DEMO_CLIENT_PASSWORD}  |  ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("[seed-demo] failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
