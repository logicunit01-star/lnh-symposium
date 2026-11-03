"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { requireDept } from "@/lib/dept";
import { decideGuest } from "@/lib/guest";

/** HOD approves a guest (speaker, chair, moderator, panelist) registered for the department's session. */
export async function decideGuestReg(id: string, f: FormData) {
  const { u, deptName } = await requireDept("dept.guests");
  const [r] = await db.select().from(s.registrations).where(eq(s.registrations.id, id));
  if (!r || r.regType !== "GUEST" || r.department !== deptName) throw new Error("This guest is not registered for your department.");
  await decideGuest(id, f.get("decision") === "APPROVE", `${u.name} (HOD, ${deptName})`, String(f.get("note") || "").trim() || null);
  revalidatePath("/admin/dept/guests");
  redirect("/admin/dept/guests?saved=1");
}

/** Chairperson, Facilitation Committee approves a volunteer. */
export async function decideVolunteer(id: string, f: FormData) {
  const u = await requirePerm("volunteers");
  const [r] = await db.select().from(s.registrations).where(eq(s.registrations.id, id));
  if (!r || r.regType !== "VOLUNTEER") throw new Error("Not a volunteer registration.");
  await decideGuest(id, f.get("decision") === "APPROVE", u.name, String(f.get("note") || "").trim() || null);
  revalidatePath("/admin/volunteers");
  redirect("/admin/volunteers?saved=1");
}
