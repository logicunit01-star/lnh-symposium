// Seeds settings, fee categories, the first admin user and DUMMY content (edit everything from /admin).
import bcrypt from "bcryptjs";
import { db, schema as s } from "../src/lib/db";
import { eq, sql } from "drizzle-orm";
import { DEMO_STAFF, EVENT_DEFAULTS, VENUES, seedDemoContent } from "../src/lib/demo-content";


async function main() {
  await db.insert(s.event).values({
    id: 1,
    ...EVENT_DEFAULTS,
    abstractWordLimit: 300,
    facebook: "https://www.facebook.com/",
    instagram: "https://www.instagram.com/",
    linkedin: "https://www.linkedin.com/",
    youtube: "https://www.youtube.com/",
    videos: [],
  }).onConflictDoNothing();

  await db.insert(s.feeCategory).values([
    { code: "FACULTY", label: "Consultants / Faculty", fee: 8000, earlyFee: 6000, order: 1, tier: "GENERAL" },
    { code: "MO", label: "Medical Officers / Residents / GPs", fee: 5000, earlyFee: 4000, order: 2, tier: "GENERAL" },
    { code: "NURSE", label: "Nurses & Allied Health", fee: 3000, earlyFee: 2500, order: 3, tier: "GENERAL" },
    { code: "STUDENT", label: "Students (valid ID required)", fee: 2000, earlyFee: 1500, order: 4, tier: "STUDENT", note: "Show a valid student ID at the registration desk." },
    { code: "LNH", label: "LNH Faculty & Staff", fee: 2500, earlyFee: 2000, order: 5, tier: "EMPLOYEE", note: "LNH employee ID is verified at the desk." },
    { code: "FOREIGN", label: "Foreign Delegates", fee: 28000, earlyFee: 22400, order: 6, tier: "FOREIGN", note: "Approx. USD 100 (early bird USD 80); charged in PKR." },
  ]).onConflictDoNothing();

  const email = process.env.SEED_ADMIN_EMAIL || "admin@lnh.edu.pk";
  const pw = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!2026";
  await db.insert(s.users).values({ name: "Super Admin", email, passwordHash: await bcrypt.hash(pw, 10), role: "SUPER_ADMIN" }).onConflictDoNothing();

  for (const u of DEMO_STAFF) {
    await db.insert(s.users).values({ ...u, role: u.role as any, passwordHash: await bcrypt.hash(pw, 10) }).onConflictDoNothing();
  }

  // Older databases: fill workshop settings once
  const [ev] = await db.select().from(s.event).where(eq(s.event.id, 1));
  if (ev && !ev.themeWeeks?.length) {
    await db.update(s.event).set({ themeWeeks: EVENT_DEFAULTS.themeWeeks, workshopStart: EVENT_DEFAULTS.workshopStart, workshopEnd: EVENT_DEFAULTS.workshopEnd }).where(eq(s.event.id, 1));
  }
  const [{ nv }] = await db.select({ nv: sql<number>`count(*)::int` }).from(s.venues);
  if (!nv) await db.insert(s.venues).values(VENUES).onConflictDoNothing();

  const added = await seedDemoContent(db);
  if (!added) { console.log("Content already present — skipped dummy content."); return; }
  console.log("Seed complete.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
