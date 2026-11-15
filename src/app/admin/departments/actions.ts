"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { staffLog } from "@/lib/staff-audit";

export type Cred = { dept: string; email: string; passcode: string };
export type CredResult = { creds?: Cred[]; error?: string } | null;

const slug = (n: string) => n.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const passcode = () => { const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; return Array.from({ length: 12 }, () => a[randomInt(a.length)]).join("") + "!" + randomInt(10, 99); };
const field = (f: FormData, k: string) => String(f.get(k) ?? "").trim().replace(/\s+/g, " ");
const back = (q: Record<string, string>) => redirect(`/admin/departments?${new URLSearchParams(q)}`);

/**
 * The shared department login (one per department, its Head role in user_departments). Creates it for every active
 * department without one, or resets one department's passcode. Passcodes are shown once.
 */
export async function issueDeptLogins(_: CredResult, f: FormData): Promise<CredResult> {
  const me = await requirePerm("departments");
  const only = String(f.get("dept") || "");
  const depts = only ? await db.select().from(s.departments).where(eq(s.departments.name, only))
    : await db.select().from(s.departments).where(and(eq(s.departments.active, true), ne(s.departments.kind, "COMMITTEE")));
  const creds: Cred[] = [];
  for (const d of depts) {
    // the shared login is the department's Head account on the .dept@lnh-symposium.local domain (kept when the department is renamed)
    const [existing] = await db.select({ id: s.users.id, email: s.users.email }).from(s.users).innerJoin(s.userDepartments, eq(s.userDepartments.userId, s.users.id))
      .where(and(eq(s.userDepartments.department, d.name), eq(s.userDepartments.role, "HEAD"), sql`${s.users.email} like '%.dept@lnh-symposium.local'`)).limit(1);
    if (existing && !only) continue;
    const email = existing?.email ?? `${slug(d.name)}.dept@lnh-symposium.local`;
    const [byEmail] = existing ? [existing] : await db.select({ id: s.users.id, email: s.users.email }).from(s.users).where(eq(s.users.email, email));
    const code = passcode();
    const hash = await bcrypt.hash(code, 10);
    let uid = byEmail?.id;
    if (byEmail) await db.update(s.users).set({ passwordHash: hash, active: true, signedOutAt: new Date() }).where(eq(s.users.id, byEmail.id));
    else uid = (await db.insert(s.users).values({ name: `Department of ${d.name}`, email, role: "DEPARTMENT", passwordHash: hash }).returning({ id: s.users.id }))[0].id;
    await db.insert(s.userDepartments).values({ userId: uid!, department: d.name, role: "HEAD" }).onConflictDoNothing();
    await staffLog(me, { id: uid, label: `Department of ${d.name} (${email})` }, byEmail ? "Passcode reset" : "Department login created");
    creds.push({ dept: d.name, email, passcode: code });
  }
  revalidatePath("/admin/departments"); revalidatePath("/admin/users");
  return creds.length ? { creds } : { error: "Every department already has a login. Use Reset to issue a new passcode." };
}

const KINDS = ["CLINICAL", "NON_CLINICAL", "ALLIED", "COMMITTEE"];

/** Add a department (Super Admin / Admin). The name must not match an existing one, ignoring capitals and spaces. */
export async function addDepartment(f: FormData) {
  const me = await requirePerm("settings");
  const name = field(f, "name");
  if (name.length < 2 || name.length > 80) return back({ err: "Enter the department name (2–80 characters)." });
  const [same] = await db.select({ name: s.departments.name }).from(s.departments).where(sql`lower(${s.departments.name}) = lower(${name})`);
  if (same) return back({ err: `“${same.name}” already exists.` });
  const [{ max }] = await db.select({ max: sql<number>`coalesce(max(${s.departments.order}), 0)::int` }).from(s.departments).where(ne(s.departments.kind, "COMMITTEE"));
  const [d] = await db.insert(s.departments).values({ name, order: max + 1, kind: KINDS.includes(field(f, "kind")) ? field(f, "kind") : "CLINICAL" }).returning();
  await staffLog(me, { label: `Department ${name}` }, "Department added");
  revalidatePath("/admin/departments");
  back({ e: String(d.id), saved: "1" });
}

/** Edit a department. A new name updates every record that uses it (users, workshops, sessions, abstracts, guests). */
export async function saveDepartment(id: number, f: FormData) {
  const me = await requirePerm("settings");
  const [d] = await db.select().from(s.departments).where(eq(s.departments.id, id));
  if (!d) return back({ err: "Department not found." });
  const name = field(f, "name"), code = field(f, "code").toUpperCase(), email = field(f, "email").toLowerCase(), kind = field(f, "kind");
  const err = (m: string) => back({ e: String(id), err: m });
  if (name.length < 2 || name.length > 80) return err("Enter the department name (2–80 characters).");
  if (code && !/^[A-Z0-9-]{2,10}$/.test(code)) return err("The short code has 2–10 letters or digits, e.g. CARD.");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err("Enter a valid department email.");
  if (!KINDS.includes(kind)) return err("Choose the type.");
  if (name !== d.name) {
    const [same] = await db.select({ name: s.departments.name }).from(s.departments).where(and(sql`lower(${s.departments.name}) = lower(${name})`, ne(s.departments.id, id)));
    if (same) return err(`“${same.name}” already exists. To combine the two, use “Merge into” below.`);
  }
  if (code) {
    const [dup] = await db.select({ name: s.departments.name }).from(s.departments).where(and(eq(s.departments.code, code), ne(s.departments.id, id)));
    if (dup) return err(`The code ${code} is already used by ${dup.name}.`);
  }
  const active = f.get("active") === "on";
  await db.update(s.departments).set({ name, code: code || null, email: email || null, kind, active, order: Number(field(f, "order")) || d.order, needsReview: name === d.name ? d.needsReview : false }).where(eq(s.departments.id, id));
  const ch = [name !== d.name && `renamed “${d.name}” → “${name}”`, (code || null) !== d.code && `code ${code || "none"}`, (email || null) !== d.email && `email ${email || "none"}`,
    kind !== d.kind && `type ${kind}`, active !== d.active && (active ? "activated" : "deactivated")].filter(Boolean).join("; ");
  if (ch) await staffLog(me, { label: `Department ${name}` }, "Department changed", ch);
  revalidatePath("/admin", "layout");
  back({ e: String(id), saved: "1" });
}

/** Merge a department into another (e.g. a misspelt one into the right one): moves every record, then removes it. */
export async function mergeDepartment(id: number, f: FormData) {
  const me = await requirePerm("settings");
  const into = String(f.get("into") || "");
  const [d] = await db.select().from(s.departments).where(eq(s.departments.id, id));
  const [t] = await db.select().from(s.departments).where(eq(s.departments.name, into));
  if (!d || !t || t.id === d.id) return back({ e: String(id), err: "Choose the department to merge into." });
  if (f.get("confirm") !== "on") return back({ e: String(id), err: `Tick the confirmation to merge “${d.name}” into “${t.name}”.` });
  await db.transaction(async (tx) => {
    await tx.execute(sql`insert into user_departments (user_id, department, role, created_at) select user_id, ${t.name}, role, created_at from user_departments where department = ${d.name} on conflict do nothing`);
    await tx.execute(sql`delete from user_departments where department = ${d.name}`);
    await tx.execute(sql`insert into session_departments (session_id, department) select session_id, ${t.name} from session_departments where department = ${d.name} on conflict do nothing`);
    await tx.execute(sql`delete from session_departments where department = ${d.name}`);
    await tx.execute(sql`update sessions set department = ${t.name} where department = ${d.name}`);
    await tx.execute(sql`update registrations set department = ${t.name} where department = ${d.name}`);
    await tx.execute(sql`update abstracts set specialty = ${t.name} where specialty = ${d.name}`);
    await tx.execute(sql`update abstracts set assigned_dept = ${t.name} where assigned_dept = ${d.name}`);
    await tx.execute(sql`delete from departments where id = ${d.id}`);
  });
  await staffLog(me, { label: `Department ${t.name}` }, "Departments merged", `“${d.name}” merged into “${t.name}”`);
  revalidatePath("/admin", "layout");
  back({ e: String(t.id), saved: "merged" });
}

export async function toggleDepartment(id: number, active: boolean) {
  const me = await requirePerm("settings");
  const [d] = await db.update(s.departments).set({ active }).where(eq(s.departments.id, id)).returning();
  if (d) await staffLog(me, { label: `Department ${d.name}` }, "Department changed", active ? "activated" : "deactivated");
  revalidatePath("/admin/departments");
}
