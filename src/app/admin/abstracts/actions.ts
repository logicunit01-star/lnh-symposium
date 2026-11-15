"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { logAbstract, sendDecisionEmails } from "@/lib/abstracts";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Phase 2: send an abstract (usually "back to secretariat") to another department, reopening that department's portal. */
export async function scReassign(id: string, f: FormData) {
  const u = await requirePerm("abstracts.review");
  const dept = str(f, "dept");
  const [d] = await db.select().from(s.departments).where(eq(s.departments.name, dept));
  if (!d) throw new Error("Choose a department");
  await db.update(s.abstracts).set({ assignedDept: dept, phase: 2, status: "SUBMITTED", hodDecision: null, hodScores: null, hodTotal: null, hodNotes: null, hodBy: null, hodAt: null }).where(eq(s.abstracts.id, id));
  await db.update(s.departments).set({ p2Required: true, p2SubmittedAt: null }).where(eq(s.departments.id, d.id));
  await logAbstract(id, u.name, `Reassigned to ${dept} (Phase 2)`, str(f, "note") || null);
  revalidatePath("/admin/abstracts", "layout");
  redirect(`/admin/abstracts/${id}?saved=1`);
}

/** Reopen a department's Phase 1 portal (e.g. sent by mistake). */
export async function reopenDept(deptId: number, phase: number) {
  const u = await requirePerm("abstracts.review");
  await db.update(s.departments).set(phase === 1 ? { p1SubmittedAt: null } : { p2SubmittedAt: null }).where(eq(s.departments.id, deptId));
  const [d] = await db.select().from(s.departments).where(eq(s.departments.id, deptId));
  const rows = await db.select({ id: s.abstracts.id }).from(s.abstracts).where(and(eq(s.abstracts.assignedDept, d.name), eq(s.abstracts.phase, phase), inArray(s.abstracts.status, ["UNDER_REVIEW", "BACK"])));
  for (const r of rows) { await db.update(s.abstracts).set({ status: "SUBMITTED" }).where(eq(s.abstracts.id, r.id)); await logAbstract(r.id, u.name, `Phase ${phase} reopened for ${d.name}`); }
  revalidatePath("/admin/departments"); revalidatePath("/admin/abstracts", "layout");
}

/** Email decisions now (normally sent by the scheduled dispatch on 31 December). */
export async function notifyDecisions() {
  const u = await requirePerm("abstracts.review");
  const n = await sendDecisionEmails(u.name);
  revalidatePath("/admin/abstracts", "layout");
  redirect(`/admin/abstracts?notified=${n}`);
}

/** Abstract grid: assign a venue and the placement details (poster board, slot, remarks). */
export async function assignAbstractVenue(id: string, f: FormData) {
  const u = await requirePerm("abstracts.review");
  const venueId = str(f, "venueId") || null, placement = str(f, "placement").slice(0, 200) || null;
  const [a] = await db.select().from(s.abstracts).where(eq(s.abstracts.id, id));
  if (!a) throw new Error("Not found");
  let venueName: string | null = null;
  if (venueId) { const [v] = await db.select().from(s.venues).where(eq(s.venues.id, venueId)); if (!v) throw new Error("Unknown venue"); venueName = v.name; }
  await db.update(s.abstracts).set({ venueId, placement }).where(eq(s.abstracts.id, id));
  if (venueId !== a.venueId || placement !== a.placement) await logAbstract(id, u.name, "Venue assigned", [venueName ?? "No venue", placement].filter(Boolean).join(" · "));
  revalidatePath("/admin/abstracts", "layout");
  const back = str(f, "back");
  redirect(back.startsWith("/admin/abstracts") ? back : `/admin/abstracts/${id}?saved=1`);
}

/**
 * Audit 16 Nov 2026 (RFP "Phase 3: final committee review"): the Scientific Committee Chair has the last word on an
 * abstract before the author is told: accept as oral, accept as poster or reject, over or instead of the department's decision.
 */
export async function finalDecision(id: string, f: FormData) {
  const u = await requirePerm("abstracts.final");
  const [a] = await db.select().from(s.abstracts).where(eq(s.abstracts.id, id));
  if (!a) redirect("/admin/abstracts");
  const back = (q: string) => redirect(`/admin/abstracts/${id}?${q}`);
  if (a.authorNotifiedAt) return back("err=notified");
  const d = str(f, "final"), note = str(f, "note");
  if (!["ACCEPT_ORAL", "ACCEPT_POSTER", "REJECT"].includes(d)) return back("err=final");
  if (note.length < 3) return back("err=reason");
  const accepted = d !== "REJECT", poster = d === "ACCEPT_POSTER";
  await db.update(s.abstracts).set({
    status: accepted ? "ACCEPTED" : "REJECTED", acceptedAs: accepted ? (poster ? "POSTER" : "ORAL") : null, type: poster ? "POSTER" : "ORAL",
    decidedAt: new Date(), scNotes: note,
    // an abstract that is no longer an accepted oral presentation leaves its session; a rejected one loses its poster placement
    ...(!accepted || poster ? { sessionId: null, sessionOrder: null } : {}),
    ...(!accepted ? { venueId: null, placement: null } : {}),
  }).where(eq(s.abstracts.id, id));
  if (!accepted || poster) await db.update(s.sessionPeople).set({ abstractId: null }).where(eq(s.sessionPeople.abstractId, id));
  const label = d === "ACCEPT_ORAL" ? "accepted as oral presentation" : d === "ACCEPT_POSTER" ? "accepted as ePoster" : "not accepted";
  await logAbstract(id, u.name, `Final decision by the Scientific Committee: ${label}`, note);
  revalidatePath("/admin/abstracts", "layout"); revalidatePath("/admin/dept/abstracts");
  back("saved=final");
}
