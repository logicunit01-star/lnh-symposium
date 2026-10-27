"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { getEvent } from "@/lib/event";
import { logAbstract } from "@/lib/abstracts";
import { sendEmail, emailLayout } from "@/lib/notify";
import { appUrl } from "@/lib/utils";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Scientific Committee quality check: final decision. */
export async function scFinalize(id: string, f: FormData) {
  const u = await requirePerm("abstracts.review");
  const d = str(f, "final");
  if (!["ORAL", "POSTER", "REJECT"].includes(d)) throw new Error("Choose a decision");
  await db.update(s.abstracts).set({
    status: d === "REJECT" ? "REJECTED" : "ACCEPTED", acceptedAs: d === "REJECT" ? null : d, type: d === "POSTER" ? "POSTER" : "ORAL",
    scNotes: str(f, "scNotes") || null, decidedAt: new Date(), reviewerId: u.sub,
  }).where(eq(s.abstracts.id, id));
  await logAbstract(id, u.name, d === "REJECT" ? "SC: rejected" : `SC: accepted as ${d.toLowerCase()}`, str(f, "scNotes") || null);
  revalidatePath("/admin/abstracts", "layout");
  redirect(`/admin/abstracts/${id}?saved=1`);
}

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

/** Email final decisions to presenting authors not yet notified. */
export async function notifyDecisions() {
  const u = await requirePerm("abstracts.review");
  const ev = await getEvent();
  const rows = await db.select().from(s.abstracts).where(and(inArray(s.abstracts.status, ["ACCEPTED", "REJECTED"]), isNull(s.abstracts.authorNotifiedAt)));
  for (const a of rows) {
    const ok = a.status === "ACCEPTED";
    await sendEmail(a.email, `${ev.name}: decision on abstract ${a.refNo}`, emailLayout("Abstract decision",
      `<p>Dear ${a.title ?? ""} ${a.fullName ?? a.presentingAuthor},</p>${ok
        ? `<p>We are pleased to inform you that your abstract <b>“${a.abstractTitle}”</b> (${a.refNo}) has been <b>accepted as ${a.acceptedAs === "POSTER" ? "a poster" : "an oral presentation"}</b>.</p><p>Session details, date, time and venue will follow once the programme is released. The presenting author must register for the symposium.</p>`
        : `<p>Thank you for submitting <b>“${a.abstractTitle}”</b> (${a.refNo}). After review by the department and the Scientific Committee, we regret that it could not be accepted this year.</p>`}`,
      ok ? { label: "Register for the symposium", href: `${appUrl()}/register` } : undefined));
    await db.update(s.abstracts).set({ authorNotifiedAt: new Date() }).where(eq(s.abstracts.id, a.id));
    await logAbstract(a.id, u.name, "Decision emailed to author");
  }
  revalidatePath("/admin/abstracts", "layout");
  redirect(`/admin/abstracts?notified=${rows.length}`);
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
