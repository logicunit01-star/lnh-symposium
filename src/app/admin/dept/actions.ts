"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireDept } from "@/lib/dept";
import { getEvent } from "@/lib/event";
import { logAbstract, reviewWindow } from "@/lib/abstracts";
import { SCORE_CRITERIA, decisionsFor, decisionLabel } from "@/lib/scientific";

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
  await logAbstract(a.id, u.name, `HOD: ${decisionLabel(decision, a.presentationPref)}`, `Score ${total}/25`);
  revalidatePath("/admin/dept/abstracts");
  redirect(`/admin/dept/abstracts?saved=${a.refNo}#a-${a.id}`);
}

/** Send all of this phase's decisions to the symposium secretariat; the department then has read-only access.
 *  SC feedback (29 Oct 2026): the HOD's decision is the review decision (Accept / Reject / Return to the Symposium Secretariat).
 *  Authors are told on the scheduled decision date (31 Dec), after the agenda is finalised. */
export async function deptSubmit(phase: number) {
  const { u, dept, deptName } = await requireDept("dept.abstracts");
  const blocked = await canReview(phase, dept);
  if (blocked) throw new Error(blocked);
  const rows = await db.select().from(s.abstracts).where(and(eq(s.abstracts.assignedDept, deptName), eq(s.abstracts.phase, phase), eq(s.abstracts.status, "SUBMITTED")));
  if (rows.some((r) => !r.hodDecision)) redirect("/admin/dept/abstracts?err=incomplete");
  for (const r of rows) {
    const d = r.hodDecision!;
    const accepted = d === "ACCEPT_ORAL" || d === "ACCEPT_POSTER";
    await db.update(s.abstracts).set(d === "BACK" ? { status: "BACK" } : {
      status: accepted ? "ACCEPTED" : "REJECTED", acceptedAs: accepted ? (d === "ACCEPT_POSTER" ? "POSTER" : "ORAL") : null,
      type: d === "ACCEPT_POSTER" ? "POSTER" : "ORAL", decidedAt: new Date(),
    }).where(eq(s.abstracts.id, r.id));
    await logAbstract(r.id, u.name, `${phase === 1 ? "Phase 1" : "Phase 2"} decision sent: ${decisionLabel(d, r.presentationPref)}`);
  }
  await db.update(s.departments).set(phase === 1 ? { p1SubmittedAt: new Date() } : { p2SubmittedAt: new Date() }).where(eq(s.departments.id, dept!.id));
  revalidatePath("/admin/dept/abstracts");
  redirect("/admin/dept/abstracts?sent=1");
}

/** HOD's final approval of the scientific session flyer (after the Scientific Committee approved the content). Approval locks it. */
export async function hodFlyerDecision(sessionId: string, f: FormData) {
  const { u, deptName } = await requireDept("dept.flyers");
  const [ses] = await db.select().from(s.sessions).where(eq(s.sessions.id, sessionId));
  if (!ses || ses.department !== deptName || !ses.proposal || ses.status !== "APPROVED") throw new Error("This session flyer is not available to your department.");
  if (ses.flyerStatus === "APPROVED") redirect(`/admin/dept/flyers?s=${sessionId}`);
  const d = String(f.get("flyer") || ""), note = String(f.get("note") || "").trim();
  if (d === "CHANGES" && !note) redirect(`/admin/dept/flyers?s=${sessionId}&err=note`);
  if (d !== "APPROVED" && d !== "CHANGES") throw new Error("Invalid");
  await db.update(s.sessions).set({ flyerStatus: d, flyerNote: note || null, flyerReviewedBy: `${u.name} (HOD)`, flyerReviewedAt: new Date() }).where(eq(s.sessions.id, sessionId));
  await db.insert(s.sessionReviews).values({ sessionId, userId: u.sub, userName: u.name, fromStatus: ses.flyerStatus, toStatus: d === "APPROVED" ? "FLYER_APPROVED" : "FLYER_CHANGES", note: d === "APPROVED" ? "Flyer approved by the HOD and locked" : note });
  revalidatePath("/admin/dept/flyers"); revalidatePath(`/admin/programme/${sessionId}`);
  redirect(`/admin/dept/flyers?s=${sessionId}&saved=${d}`);
}
