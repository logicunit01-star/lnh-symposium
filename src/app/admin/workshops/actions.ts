"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm, staffScope } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getEvent } from "@/lib/event";
import { themeWeekOf } from "@/lib/demo-content";
import { sendEmail, emailLayout } from "@/lib/notify";
import { appUrl, fmtDate, fmtTime24 } from "@/lib/utils";

export type FormResult = { error?: string; ok?: string } | null;

const str = (f: FormData, k: string) => { const v = f.get(k); return v == null || v === "" ? null : String(v).trim(); };
const int = (f: FormData, k: string, d = 0) => { const v = Number(str(f, k)); return Number.isFinite(v) && v >= 0 ? Math.round(v) : d; };
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE = /^(\+92|0)3\d{2}-?\d{7}$/;

function parseEquipment(raw: string | null) {
  return (raw || "").split(/\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const [item, qty, ...rest] = l.split(",").map((x) => x.trim());
    return { item: item || l, qty: Math.max(1, Number(qty) || 1), source: rest.join(", ") || "To confirm" };
  }).slice(0, 40);
}

async function log(sessionId: string, u: { sub: string; name: string }, from: string | null, to: string, note?: string | null) {
  await db.insert(s.sessionReviews).values({ sessionId, userId: u.sub, userName: u.name, fromStatus: from, toStatus: to, note: note ?? null });
}

/** Form A — submit a new request or edit an unlocked one. */
export async function submitWorkshop(_: FormResult, f: FormData): Promise<FormResult> {
  const u = await requirePerm("workshops");
  const id = str(f, "id");
  if (!id && !can(u.role, "workshops.submit")) return { error: "Your role cannot submit workshop requests." };
  const sc = await staffScope(u);
  const ev = await getEvent();

  let existing: typeof s.sessions.$inferSelect | undefined;
  if (id) {
    [existing] = await db.select().from(s.sessions).where(eq(s.sessions.id, id));
    if (!existing || existing.type !== "WORKSHOP") return { error: "Workshop not found." };
    const own = !sc.all && existing.department === sc.department;
    if (!(can(u.role, "workshops.edit") || (own && can(u.role, "workshops.submit")))) return { error: "You cannot edit this request." };
    if (existing.locked) return { error: "This request is locked after the committee decision. Ask a Co-Chair to unlock it for revision." };
  }

  const title = str(f, "title") ?? "";
  const date = str(f, "date") ?? "";
  const start = `${str(f, "startH")}:${str(f, "startM")}`, end = `${str(f, "endH")}:${str(f, "endM")}`;
  const department = sc.all ? str(f, "department") : sc.department;
  const venueId = str(f, "venueId");
  const capacity = int(f, "capacity");
  const contact = str(f, "facultyContact");

  if (title.length < 5) return { error: "Enter the workshop title (at least 5 characters)." };
  if (!department) return { error: "Choose the owning department." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick the proposed date." };
  const startsAt = new Date(`${date}T${start}:00+05:00`), endsAt = new Date(`${date}T${end}:00+05:00`);
  if (ev.workshopStart && ev.workshopEnd && (startsAt < ev.workshopStart || startsAt > ev.workshopEnd))
    return { error: `The date must fall inside the workshop window (${fmtDate(ev.workshopStart, { day: "numeric", month: "short", year: "numeric" })} – ${fmtDate(ev.workshopEnd, { day: "numeric", month: "short", year: "numeric" })}).` };
  if (!HHMM.test(start) || !HHMM.test(end) || endsAt <= startsAt) return { error: "End time must be after start time (24-hour HH:MM)." };
  if (!venueId) return { error: "Choose a venue." };
  const [venue] = await db.select().from(s.venues).where(eq(s.venues.id, venueId));
  if (!venue) return { error: "Venue not found." };
  if (capacity < 1) return { error: "Seat cap must be at least 1." };
  if (capacity > venue.capacity) return { error: `Seat cap ${capacity} exceeds the capacity of ${venue.name} (${venue.capacity}).` };
  if (contact && !PHONE.test(contact.replace(/\s/g, ""))) return { error: "Speaker contact number must look like 0300-1234567." };

  const clash = await db.select({ title: s.sessions.title, a: s.sessions.startsAt, b: s.sessions.endsAt }).from(s.sessions).where(and(
    eq(s.sessions.venueId, venueId), ne(s.sessions.status, "REJECTED"), sql`${s.sessions.startsAt} < ${endsAt}`, sql`${s.sessions.endsAt} > ${startsAt}`,
    id ? ne(s.sessions.id, id) : undefined,
  ));
  if (clash.length) return { error: `${venue.name} is already booked ${fmtTime24(clash[0].a)}–${fmtTime24(clash[0].b)} that day for “${clash[0].title}”. Choose another time or venue.` };

  const fee = int(f, "fee"), earlyFee = str(f, "earlyFee") ? int(f, "earlyFee") : null;
  const data = {
    title, description: str(f, "description"), department, contributors: str(f, "contributors"), format: str(f, "format"),
    category: str(f, "category") === "A" ? "A" : "B", themeWeek: themeWeekOf(date, ev.themeWeeks),
    startsAt, endsAt, venueId, hall: venue.name, capacity, fee, earlyFee, cmeHours: str(f, "cmeHours") ? Number(str(f, "cmeHours")) : null,
    leadFaculty: str(f, "leadFaculty"), facultyDegrees: str(f, "facultyDegrees"), facultyContact: contact, facultyProfile: str(f, "facultyProfile"),
    facilitators: int(f, "facilitators"), volunteers: int(f, "volunteers"), technicians: int(f, "technicians"),
    equipment: parseEquipment(str(f, "equipment")),
  };

  let sid = id;
  if (existing) {
    await db.update(s.sessions).set(data).where(eq(s.sessions.id, existing.id));
    await log(existing.id, u, existing.status, existing.status, "Request edited");
  } else {
    const slug = `ws-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50)}-${Math.random().toString(36).slice(2, 6)}`;
    const [row] = await db.insert(s.sessions).values({
      ...data, slug, type: "WORKSHOP", day: 0, registrable: true, status: "SUBMITTED", submittedAt: new Date(), proposedById: u.sub,
    }).returning({ id: s.sessions.id });
    sid = row.id;
    await log(sid, u, null, "SUBMITTED", "Form A submitted");
  }
  revalidatePath("/admin/workshops", "layout");
  redirect(`/admin/workshops/${sid}?saved=1`);
}

/** Committee workflow: Under review (members), Approve / Reject (Co-Chairs). Approve and Reject lock the record. */
export async function reviewWorkshop(id: string, f: FormData) {
  const to = str(f, "status") ?? "";
  const note = str(f, "note");
  const u = await requirePerm(to === "UNDER_REVIEW" ? "workshops.edit" : "workshops.review");
  if (!["UNDER_REVIEW", "APPROVED", "REJECTED"].includes(to)) throw new Error("Invalid status");
  const [w] = await db.select().from(s.sessions).where(eq(s.sessions.id, id));
  if (!w) throw new Error("Not found");
  if (w.locked) throw new Error("Locked. Unlock for revision first.");
  if (to === "REJECTED" && !note) redirect(`/admin/workshops/${id}?err=note`);
  const decided = to === "APPROVED" || to === "REJECTED";
  await db.update(s.sessions).set({
    status: to, reviewNote: note ?? w.reviewNote, locked: decided,
    ...(decided ? { reviewedAt: new Date(), reviewedById: u.sub } : {}),
  }).where(eq(s.sessions.id, id));
  await log(id, u, w.status, to, note);
  if (decided && w.proposedById) {
    const [p] = await db.select().from(s.users).where(eq(s.users.id, w.proposedById));
    if (p) await sendEmail(p.email, `Workshop request ${to === "APPROVED" ? "approved" : "not approved"}: ${w.title}`, emailLayout("Workshop request decision",
      `<p>Dear ${p.name},</p><p>The Workshop Programme Committee has <b>${to === "APPROVED" ? "approved" : "not approved"}</b> “${w.title}” (${fmtDate(w.startsAt)}).</p>${note ? `<p>Committee note: ${note.replace(/</g, "&lt;")}</p>` : ""}${to === "APPROVED" ? `<p>It is now live in the catalogue. Flyer: ${appUrl()}/api/workshops/${w.slug}/flyer</p>` : ""}`));
  }
  revalidatePath("/admin/workshops", "layout"); revalidatePath("/", "layout");
  redirect(`/admin/workshops/${id}`);
}

export async function unlockWorkshop(id: string, f: FormData) {
  const u = await requirePerm("workshops.review");
  const [w] = await db.select().from(s.sessions).where(eq(s.sessions.id, id));
  if (!w) throw new Error("Not found");
  const note = str(f, "note") || "Unlocked for revision";
  await db.update(s.sessions).set({ locked: false, status: "UNDER_REVIEW" }).where(eq(s.sessions.id, id));
  await log(id, u, w.status, "UNDER_REVIEW", note);
  revalidatePath("/admin/workshops", "layout"); revalidatePath("/", "layout");
  redirect(`/admin/workshops/${id}`);
}

/** Co-Chairs' remediation for low-fill workshops. CANCEL closes sales. */
export async function decideLowFill(id: string, f: FormData) {
  const u = await requirePerm("workshops.review");
  const d = str(f, "decision") ?? "";
  if (!["RUN", "MERGE", "CANCEL", "PROMOTE"].includes(d)) throw new Error("Invalid decision");
  const [w] = await db.select().from(s.sessions).where(eq(s.sessions.id, id));
  await db.update(s.sessions).set({ coChairDecision: d, ...(d === "CANCEL" ? { registrable: false } : {}) }).where(eq(s.sessions.id, id));
  await log(id, u, w?.status ?? null, w?.status ?? "APPROVED", `Low-fill decision: ${d}${str(f, "note") ? ` — ${str(f, "note")}` : ""}`);
  revalidatePath("/admin/workshops", "layout"); revalidatePath("/", "layout");
}

export async function deleteWorkshop(id: string) {
  const u = await requirePerm("workshops");
  const sc = await staffScope(u);
  const [w] = await db.select().from(s.sessions).where(eq(s.sessions.id, id));
  if (!w) redirect("/admin/workshops");
  const own = !sc.all && w.department === sc.department;
  if (!(can(u.role, "workshops.review") || (own && can(u.role, "workshops.submit") && !w.locked))) throw new Error("You cannot withdraw this request.");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.registrationItems).where(eq(s.registrationItems.sessionId, id));
  if (n > 0) throw new Error("This workshop has registrations. Use the Cancel decision instead.");
  await db.delete(s.sessions).where(eq(s.sessions.id, id));
  revalidatePath("/admin/workshops", "layout"); revalidatePath("/", "layout");
  redirect("/admin/workshops?deleted=1");
}

/** Email the next people on the waitlist when seats are free. */
export async function notifyWaitlist(id: string) {
  await requirePerm("workshops.edit");
  const [w] = await db.select().from(s.sessions).where(eq(s.sessions.id, id));
  if (!w?.capacity) return;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.registrationItems)
    .innerJoin(s.registrations, eq(s.registrations.id, s.registrationItems.registrationId))
    .where(and(eq(s.registrationItems.sessionId, id), inArray(s.registrations.paymentStatus, ["PENDING", "PAID", "WAIVED"])));
  const free = Math.max(0, w.capacity - n);
  if (!free) return;
  const next = await db.select().from(s.waitlist).where(and(eq(s.waitlist.sessionId, id), isNull(s.waitlist.notifiedAt))).orderBy(asc(s.waitlist.createdAt)).limit(free);
  for (const p of next) {
    await sendEmail(p.email, `A seat is free: ${w.title}`, emailLayout("A seat is free", `<p>Dear ${p.name},</p><p>A seat has opened in <b>${w.title}</b> on ${fmtDate(w.startsAt)}. Seats go to whoever pays first: <a href="${appUrl()}/workshops">book now</a>.</p>`));
    await db.update(s.waitlist).set({ notifiedAt: new Date() }).where(eq(s.waitlist.id, p.id));
  }
  revalidatePath(`/admin/workshops/${id}`);
}

// ---------------- venues ----------------
export async function saveVenue(id: string | null, f: FormData) {
  await requirePerm("venues");
  const pct = (k: string) => Math.min(100, Math.max(0, Number(str(f, k)) || 50));
  const data = {
    name: str(f, "name")!, building: str(f, "building") || "—", floor: str(f, "floor"), capacity: int(f, "capacity", 1),
    onlineFacility: str(f, "onlineFacility"), equipment: str(f, "equipment"), directions: str(f, "directions"),
    mapX: pct("mapX"), mapY: pct("mapY"), active: f.get("active") === "on",
  };
  if (id) {
    await db.update(s.venues).set(data).where(eq(s.venues.id, id));
    await db.update(s.sessions).set({ hall: data.name }).where(eq(s.sessions.venueId, id));
  } else await db.insert(s.venues).values(data);
  revalidatePath("/admin/venues"); revalidatePath("/venues");
  redirect(`/admin/venues${id ? `?v=${id}` : ""}`);
}
export async function deleteVenue(id: string) {
  await requirePerm("venues");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.sessions).where(eq(s.sessions.venueId, id));
  if (n > 0) await db.update(s.venues).set({ active: false }).where(eq(s.venues.id, id)); // keep history
  else await db.delete(s.venues).where(eq(s.venues.id, id));
  revalidatePath("/admin/venues"); redirect("/admin/venues");
}
