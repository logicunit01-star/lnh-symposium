// Seeds settings, fee categories, the first admin user and DUMMY content (edit everything from /admin).
import bcrypt from "bcryptjs";
import { db, schema as s } from "../src/lib/db";
import { EVENT_DEFAULTS, seedDemoContent } from "../src/lib/demo-content";


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
    { code: "FACULTY", label: "Consultants / Faculty", fee: 8000, earlyFee: 6000, order: 1 },
    { code: "MO", label: "Medical Officers / Residents / GPs", fee: 5000, earlyFee: 4000, order: 2 },
    { code: "NURSE", label: "Nurses & Allied Health", fee: 3000, earlyFee: 2500, order: 3 },
    { code: "STUDENT", label: "Students (valid ID required)", fee: 2000, earlyFee: 1500, order: 4, note: "Show a valid student ID at the registration desk." },
    { code: "LNH", label: "LNH Faculty & Staff", fee: 2500, earlyFee: 2000, order: 5 },
  ]).onConflictDoNothing();

  const email = process.env.SEED_ADMIN_EMAIL || "admin@lnh.edu.pk";
  const pw = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!2026";
  await db.insert(s.users).values({ name: "Super Admin", email, passwordHash: await bcrypt.hash(pw, 10), role: "SUPER_ADMIN" }).onConflictDoNothing();

  const added = await seedDemoContent(db);
  if (!added) { console.log("Content already present — skipped dummy content."); return; }
  console.log("Seed complete.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
