"use server";
import { revalidatePath } from "next/cache";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";

export type Cred = { dept: string; email: string; passcode: string };
export type CredResult = { creds?: Cred[]; error?: string } | null;

const slug = (n: string) => n.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const passcode = () => { const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; return Array.from({ length: 10 }, () => a[randomInt(a.length)]).join("") + "!" + randomInt(10, 99); };

/** Create a login for every department that has none, or reset one department's passcode. Passcodes are shown once. */
export async function issueDeptLogins(_: CredResult, f: FormData): Promise<CredResult> {
  await requirePerm("departments");
  const only = String(f.get("dept") || "");
  const depts = only ? await db.select().from(s.departments).where(eq(s.departments.name, only)) : await db.select().from(s.departments).where(eq(s.departments.active, true));
  const creds: Cred[] = [];
  for (const d of depts) {
    const [existing] = await db.select().from(s.users).where(and(eq(s.users.role, "HOD"), eq(s.users.department, d.name)));
    if (existing && !only) continue;
    const code = passcode();
    const hash = await bcrypt.hash(code, 10);
    if (existing) {
      await db.update(s.users).set({ passwordHash: hash, active: true }).where(eq(s.users.id, existing.id));
      creds.push({ dept: d.name, email: existing.email, passcode: code });
    } else {
      const email = `${slug(d.name)}.dept@lnh-symposium.local`;
      await db.insert(s.users).values({ name: `Department of ${d.name}`, email, role: "HOD", department: d.name, passwordHash: hash }).onConflictDoNothing();
      creds.push({ dept: d.name, email, passcode: code });
    }
  }
  revalidatePath("/admin/departments");
  return creds.length ? { creds } : { error: "Every department already has a login. Use Reset to issue a new passcode." };
}

export async function addDepartment(f: FormData) {
  await requirePerm("departments");
  const name = String(f.get("name") || "").trim();
  if (name.length < 2) return;
  await db.insert(s.departments).values({ name, order: 999 }).onConflictDoNothing();
  revalidatePath("/admin/departments");
}
export async function toggleDepartment(id: number, active: boolean) {
  await requirePerm("departments");
  await db.update(s.departments).set({ active }).where(eq(s.departments.id, id));
  revalidatePath("/admin/departments");
}
