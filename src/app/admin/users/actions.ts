"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { DEPT_ROLE_LABEL, DEPT_ROLES, MIN_STAFF_PASSWORD, ROLE_LABEL, type DeptRole } from "@/lib/permissions";
import { staffLog } from "@/lib/staff-audit";

const field = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const MIN_PASSWORD = MIN_STAFF_PASSWORD;
const back = (q: Record<string, string>) => redirect(`/admin/users?${new URLSearchParams(q)}`);

/**
 * Users & roles (Super Admin). Saves a staff login: global role, department roles, status and password.
 * 15 Nov 2026 audit: friendly errors, 12-character passwords, no self-demotion or self-deactivation, at least one
 * active Super Admin, one active focal person per department, sign-out on password reset / deactivation, change log.
 */
export async function saveStaff(id: string | null, f: FormData) {
  const me = await requirePerm("users");
  const err = (msg: string) => back({ ...(id ? { u: id } : { u: "new" }), err: msg });
  const name = field(f, "name"), email = field(f, "email").toLowerCase(), role = field(f, "role"), pw = field(f, "password"), active = f.get("active") === "on";
  if (name.length < 2) return err("Enter the name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err("Enter a valid email address.");
  if (!(role in ROLE_LABEL)) return err("Choose a role.");
  if (!id && !pw) return err(`Set a password for the new login (at least ${MIN_PASSWORD} characters).`);
  if (pw && pw.length < MIN_PASSWORD) return err(`The password must be at least ${MIN_PASSWORD} characters.`);
  if (pw && pw.toLowerCase().includes(email.split("@")[0]) && email.split("@")[0].length > 3) return err("The password must not contain the email name.");

  // department roles: existing rows (role or "remove") and up to 3 new rows
  const wanted = new Map<string, DeptRole>();
  for (const [k, v] of f.entries()) {
    const m = k.match(/^dr_(.+)$/); if (!m || v === "REMOVE") continue;
    if (DEPT_ROLES.includes(v as DeptRole)) wanted.set(m[1], v as DeptRole);
  }
  for (let i = 0; i < 3; i++) {
    const d = field(f, `new_dept_${i}`), r = field(f, `new_role_${i}`);
    if (d && DEPT_ROLES.includes(r as DeptRole)) wanted.set(d, r as DeptRole);
    else if (d && !r) return err(`Choose the role in ${d}.`);
  }
  if (wanted.size) {
    const known = await db.select({ n: s.departments.name }).from(s.departments).where(inArray(s.departments.name, [...wanted.keys()]));
    if (known.length !== wanted.size) return err("Choose departments from the list.");
  }
  if (role === "DEPARTMENT" && !wanted.size) return err("A department staff login needs at least one department role.");

  const [dupe] = await db.select({ id: s.users.id }).from(s.users).where(id ? and(eq(s.users.email, email), ne(s.users.id, id)) : eq(s.users.email, email));
  if (dupe) return err(`Another login already uses ${email}.`);
  const [old] = id ? await db.select().from(s.users).where(eq(s.users.id, id)) : [];
  if (id && !old) return err("This login no longer exists.");

  // safety: never lock the console
  if (old && old.id === me.sub && (role !== old.role || !active)) return err("You cannot change your own role or deactivate yourself. Ask another Super Admin.");
  if (old?.role === "SUPER_ADMIN" && old.active && (role !== "SUPER_ADMIN" || !active)) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.users).where(and(eq(s.users.role, "SUPER_ADMIN"), eq(s.users.active, true), ne(s.users.id, old.id)));
    if (!n) return err("This is the last active Super Admin. Make someone else Super Admin first.");
  }
  // one active focal person per department
  const focal = [...wanted].filter(([, r]) => r === "FOCAL_PERSON").map(([d]) => d);
  if (active && focal.length) {
    const others = await db.select({ d: s.userDepartments.department, name: s.users.name }).from(s.userDepartments).innerJoin(s.users, eq(s.users.id, s.userDepartments.userId))
      .where(and(inArray(s.userDepartments.department, focal), eq(s.userDepartments.role, "FOCAL_PERSON"), eq(s.users.active, true), id ? ne(s.users.id, id) : undefined));
    if (others.length) return err(`${others[0].d} already has a focal person (${others[0].name}). Remove that role first.`);
  }

  const now = new Date();
  const data: Partial<typeof s.users.$inferInsert> = { name, email, role: role as any, active };
  if (pw) data.passwordHash = await bcrypt.hash(pw, 10);
  // a password reset or deactivation ends that person's open sign-ins (not your own: you stay signed in)
  if (old && old.id !== me.sub && ((pw && true) || (old.active && !active))) data.signedOutAt = now;
  let uid = id;
  if (old) await db.update(s.users).set(data).where(eq(s.users.id, old.id));
  else uid = (await db.insert(s.users).values({ ...data, passwordHash: data.passwordHash! } as typeof s.users.$inferInsert).returning({ id: s.users.id }))[0].id;

  const before = old ? await db.select({ d: s.userDepartments.department, r: s.userDepartments.role }).from(s.userDepartments).where(eq(s.userDepartments.userId, uid!)) : [];
  await db.delete(s.userDepartments).where(eq(s.userDepartments.userId, uid!));
  if (wanted.size) await db.insert(s.userDepartments).values([...wanted].map(([department, r]) => ({ userId: uid!, department, role: r })));

  // change log
  const target = { id: uid, label: `${name} (${email})` };
  const fmt = (list: { d: string; r: string }[]) => list.map((x) => `${x.d}: ${DEPT_ROLE_LABEL[x.r as DeptRole] ?? x.r}`).sort().join("; ") || "none";
  const after = [...wanted].map(([d, r]) => ({ d, r }));
  if (!old) await staffLog(me, target, "Created", `Role ${ROLE_LABEL[role]}; departments ${fmt(after)}`);
  else {
    const ch: string[] = [];
    if (old.name !== name) ch.push(`name "${old.name}" → "${name}"`);
    if (old.email !== email) ch.push(`email ${old.email} → ${email}`);
    if (old.role !== role) ch.push(`role ${ROLE_LABEL[old.role] ?? old.role} → ${ROLE_LABEL[role]}`);
    if (old.active !== active) ch.push(active ? "activated" : "deactivated");
    if (fmt(before) !== fmt(after)) ch.push(`departments ${fmt(before)} → ${fmt(after)}`);
    if (pw) ch.push("password reset");
    if (ch.length) await staffLog(me, target, "Changed", ch.join("; "));
  }
  console.log(`[users] ${me.email} saved ${email}`); // no passwords logged
  revalidatePath("/admin/users"); revalidatePath("/admin/departments");
  back({ u: uid!, saved: "1" });
}
