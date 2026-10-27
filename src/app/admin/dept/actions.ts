"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireDept } from "@/lib/dept";
import { getEvent } from "@/lib/event";
import { logAbstract, reviewWindow } from "@/lib/abstracts";
import { SCORE_CRITERIA, decisionsFor, HOD_DECISION_LABEL } from "@/lib/scientific";

/** Can this department act on abstracts of this phase right now? */
async function canReview(phase: number, dept: typeof s.departments.$inferSelect | null) {
  const w = reviewWindow(await getEvent());
  if (!dept) return "No department is linked to this login.";
  if (phase === 1) return !w.p1 ? "The Phase 1 review window is closed." : dept.p1SubmittedAt ? "Phase 1 decisions were already sent to the secretariat." : null;
  return !w.p2 ? "The Phase 2 review window is closed." : !dept.p2Required ? "No abstracts were assigned to this department in Phase 2." : dept.p2SubmittedAt ? "Phase 2 decisions were already sent." : null;
}

export async function deptDecide(abstractId: string, f: FormData) {
  const { u, dept, deptName } = await requireDept("dept.abstracts");
  const [a] = await db.select().from(s.abstracts).where(eq(s.abstracts.id, abstractId));
  if (!a || a.assignedDept !== deptName) throw new Error("This abstract is not assigned to your department.");
  const blocked = await canReview(a.phase, dept);
  if (blocked) throw new Error(blocked);
  const decision = String(f.get("decision") || "");
  if (!decisionsFor(a.presentationPref).includes(decision)) redirect(`/admin/dept/abstracts?err=decision#a-${a.id}`);
  const scores = Object.fromEntries(SCORE_CRITERIA.map(([k]) => [k, Math.min(5, Math.max(1, Number(f.get(`sc_${k}`)) || 0))]));
  if (Object.values(scores).some((v) => !v)) redirect(`/admin/dept/abstracts?err=score#a-${a.id}`);
  const total = Object.values(scores).reduce((x, y) => x + y, 0);
  await db.update(s.abstracts).set({ hodDecision: decision, hodScores: scores, hodTotal: total, hodNotes: String(f.get("notes") || "").trim() || null, hodBy: u.name, hodAt: new Date() }).where(eq(s.abstracts.id, a.id));
  await logAbstract(a.id, u.name, `HOD: ${HOD_DECISION_LABEL[decision]}`, `Score ${total}/25`);
  revalidatePath("/admin/dept/abstracts");
  redirect(`/admin/dept/abstracts?saved=${a.refNo}#a-${a.id}`);
}

/** Send all of this phase's decisions back to the secretariat; the department then has read-only access. */
export async function deptSubmit(phase: number) {
  const { u, dept, deptName } = await requireDept("dept.abstracts");
  const blocked = await canReview(phase, dept);
  if (blocked) throw new Error(blocked);
  const rows = await db.select().from(s.abstracts).where(and(eq(s.abstracts.assignedDept, deptName), eq(s.abstracts.phase, phase), eq(s.abstracts.status, "SUBMITTED")));
  if (rows.some((r) => !r.hodDecision)) redirect("/admin/dept/abstracts?err=incomplete");
  for (const r of rows) {
    await db.update(s.abstracts).set({ status: r.hodDecision === "BACK" ? "BACK" : "UNDER_REVIEW" }).where(eq(s.abstracts.id, r.id));
    await logAbstract(r.id, u.name, phase === 1 ? "Sent to secretariat (Phase 1)" : "Sent to secretariat (Phase 2)");
  }
  await db.update(s.departments).set(phase === 1 ? { p1SubmittedAt: new Date() } : { p2SubmittedAt: new Date() }).where(eq(s.departments.id, dept!.id));
  revalidatePath("/admin/dept/abstracts");
  redirect("/admin/dept/abstracts?sent=1");
}
