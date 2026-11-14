// Seeds settings, fee categories, the first admin user and DUMMY content (edit everything from /admin).
import bcrypt from "bcryptjs";
import { db, schema as s } from "../src/lib/db";
import { eq, sql } from "drizzle-orm";
import { DEMO_STAFF, EVENT_DEFAULTS, VENUES, seedDemoContent, seedDepartments } from "../src/lib/demo-content";
import { DEFAULT_TIERS } from "../src/lib/reg-fields";


async function main() {
  await db.insert(s.event).values({
    id: 1,
    ...EVENT_DEFAULTS,
    abstractWordLimit: 300,
    videos: [],
  }).onConflictDoNothing();

  // Registration Forms 2027 fee tiers (early bird / regular) — also created by migration 0007 on existing databases
  await db.insert(s.feeCategory).values([
    ...DEFAULT_TIERS.map((t, i) => ({ code: t.code, label: `Tier ${i + 1}: ${t.designations.join(", ")}`, fee: t.regular, earlyFee: t.early, order: i + 1, tier: "GENERAL", designations: t.designations })),
    { code: "GUEST", label: "Guest (invited speaker, chairperson, moderator, panelist)", fee: 0, earlyFee: 0, order: 90, tier: "GENERAL", active: false },
    { code: "VOLUNTEER", label: "Volunteer", fee: 0, earlyFee: 0, order: 91, tier: "GENERAL", active: false },
  ]).onConflictDoNothing();

  const email = process.env.SEED_ADMIN_EMAIL || "admin@lnh.edu.pk";
  const pw = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!2026";
  await db.insert(s.users).values({ name: "Super Admin", email, passwordHash: await bcrypt.hash(pw, 10), role: "SUPER_ADMIN" }).onConflictDoNothing();

  // Production (LNH server): SEED_DEMO=0 skips the demo staff logins and the dummy programme content
  const demo = process.env.SEED_DEMO !== "0";
  if (demo) for (const u of DEMO_STAFF) {
    await db.insert(s.users).values({ ...u, role: u.role as any, passwordHash: await bcrypt.hash(pw, 10) }).onConflictDoNothing();
  }

  // Older databases: fill workshop settings once
  const [ev] = await db.select().from(s.event).where(eq(s.event.id, 1));
  if (ev && !ev.themeWeeks?.length) {
    await db.update(s.event).set({ themeWeeks: EVENT_DEFAULTS.themeWeeks, workshopStart: EVENT_DEFAULTS.workshopStart, workshopEnd: EVENT_DEFAULTS.workshopEnd }).where(eq(s.event.id, 1));
  }
  const [{ nv }] = await db.select({ nv: sql<number>`count(*)::int` }).from(s.venues);
  if (!nv) await db.insert(s.venues).values(VENUES.map((v) => ({ ...v, usage: "SCIENTIFIC" }))).onConflictDoNothing(); // D5: the 43 workshop rooms come from migration 0015

  await seedDepartments(db);
  // SC feedback: official sender for automated emails, and the default dispatch schedule (31 Dec)
  await db.execute(sql`update event set email_from = 'Scientific Committee, 9th LNH Symposium <' || contact_email || '>' where email_from is null`);
  const [{ nj }] = await db.select({ nj: sql<number>`count(*)::int` }).from(s.emailJobs);
  if (!nj) await db.insert(s.emailJobs).values([
    { kind: "ABSTRACT_DECISIONS", runAt: new Date("2026-12-31T10:00:00+05:00"), createdBy: "Default schedule (SC feedback)", note: "After finalisation of the agenda" },
    { kind: "INVITATIONS", runAt: new Date("2026-12-31T10:30:00+05:00"), createdBy: "Default schedule (SC feedback)", note: "After finalisation of the agenda" },
  ]);
  if (ev && !ev.sessionSlots?.length) {
    const { sessionSlots, agendaTemplates, abstractP1Open, abstractP1Close, abstractP2Open, abstractP2Close, sciLockAt } = EVENT_DEFAULTS;
    await db.update(s.event).set({ sessionSlots, agendaTemplates, abstractP1Open, abstractP1Close, abstractP2Open, abstractP2Close, sciLockAt }).where(eq(s.event.id, 1));
  }
  if (!demo) { console.log("Seed complete (no demo content, SEED_DEMO=0)."); return; }
  const added = await seedDemoContent(db);
  if (!added) { console.log("Content already present — skipped dummy content."); return; }
  console.log("Seed complete.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
