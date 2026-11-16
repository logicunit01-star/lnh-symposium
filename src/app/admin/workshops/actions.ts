"use server";
import { sendTemplate } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm, staffScope } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getEvent } from "@/lib/event";
import { themeWeekOf } from "@/lib/demo-content";
import { sendEmail, emailLayout } from "@/lib/notify";
import { appUrl, fmtDate, ymdPk } from "@/lib/utils";
import { addDays, isSunday, roomClash, spanHasSunday, todayPk } from "@/lib/wp-avail";

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
  if (!id && !can(u, "workshops.submit")) return { error: "Your role cannot submit workshop requests." };
  const sc = await staffScope(u);
  const ev = await getEvent();

  let existing: typeof s.sessions.$inferSelect | undefined;
  if (id) {
    [existing] = await db.select().from(s.sessions).where(eq(s.sessions.id, id));
    if (!existing || existing.type !== "WORKSHOP") return { error: "Workshop not found." };
    const own = !sc.all && sc.departments.includes(existing.department ?? "");
    if (!(can(u, "workshops.edit") || (own && can(u, "workshops.submit")))) return { error: "You cannot edit this request." };
    // D3 (13 Nov): editable until the committee decides; after that only the committee (Co-Chairs) or Super Admin can edit
    if (existing.locked && !can(u, "workshops.review")) return { error: "This request is locked after the committee decision. The committee or Super Admin can still edit it." };
  }

  const title = str(f, "title") ?? "";
  const date = str(f, "date") ?? "";
  const start = `${str(f, "startH")}:${str(f, "startM")}`;
  // End time follows the chosen duration (Dashboard Findings, 9 Nov: hours restricted by the workshop duration)
  const dur = int(f, "duration"), sm = Number(str(f, "startH")) * 60 + Number(str(f, "startM"));
  const end = dur >= 30 && sm + dur <= 24 * 60 ? `${String(Math.floor((sm + dur) / 60)).padStart(2, "0")}:${String((sm + dur) % 60).padStart(2, "0")}` : `${str(f, "endH")}:${str(f, "endM")}`;
  // department staff choose among their own departments; the database refuses a name that is not on the department list
  const picked = str(f, "department");
  const department = sc.all ? picked : sc.departments.length === 1 ? sc.departments[0] : sc.departments.includes(picked ?? "") ? picked : null;
  if (!department) return { error: "Choose the owning department." };
  const [deptRow] = await db.select({ active: s.departments.active }).from(s.departments).where(eq(s.departments.name, department));
  if (!deptRow) return { error: "Choose the owning department from the list." };
  const contributors = [...new Set(f.getAll("contributors").map(String).filter((d) => d && d !== department))];
  if (contributors.length) {
    const known = await db.select({ n: s.departments.name }).from(s.departments).where(inArray(s.departments.name, contributors));
    if (known.length !== contributors.length) return { error: "Choose contributing departments from the list." };
  }
  const mode = ["ONSITE", "ONLINE", "HYBRID"].includes(str(f, "mode") ?? "") ? str(f, "mode")! : "ONSITE";
  const days = Math.min(3, Math.max(1, int(f, "days", 1)));
  const venueId = mode === "ONLINE" ? null : str(f, "venueId");
  const onlineLink = mode === "ONSITE" ? null : str(f, "onlineLink");
  const capacity = int(f, "capacity");
  const contact = str(f, "facultyContact");

  if (title.length < 5) return { error: "Enter the workshop title (at least 5 characters)." };
  if (title.length > 100) return { error: "The workshop title can be at most 100 characters (best under 70 for the flyer)." };
  const flyerSummary = str(f, "flyerSummary");
  if (flyerSummary && flyerSummary.length > 140) return { error: "The flyer summary can be at most 140 characters." };
  if (!department) return { error: "Choose the owning department." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick the proposed date." };
  // No past dates and no Sundays (Dashboard Findings, 9 Nov); an existing request may keep its own date
  const keepsDate = !!existing && ymdPk(existing.startsAt) === date;
  if (!keepsDate && date < todayPk()) return { error: "The date has passed. Choose a date from today onwards." };
  if (!keepsDate && isSunday(date)) return { error: "Workshops cannot be held on a Sunday. Choose another day." };
  if (days > 1 && spanHasSunday(date, days)) return { error: `A ${days}-day workshop cannot include a Sunday. Choose another start date.` };
  // D1: multi-day workshops run 09:00-17:00 on consecutive days; the record spans first day 09:00 to last day 17:00
  const [s0, e0] = days > 1 ? ["09:00", "17:00"] : [start, end];
  const startsAt = new Date(`${date}T${s0}:00+05:00`), endsAt = new Date(`${addDays(date, days - 1)}T${e0}:00+05:00`);
  if (ev.workshopStart && ev.workshopEnd && (startsAt < ev.workshopStart || endsAt > ev.workshopEnd) && !keepsDate)
    return { error: `The date must fall inside the workshop window (${fmtDate(ev.workshopStart, { day: "numeric", month: "short", year: "numeric" })} – ${fmtDate(ev.workshopEnd, { day: "numeric", month: "short", year: "numeric" })}).` };
  if (!HHMM.test(s0) || !HHMM.test(e0) || endsAt <= startsAt) return { error: "End time must be after start time (24-hour HH:MM)." };
  if (mode !== "ONLINE" && !venueId) return { error: "Choose a venue." };
  const [venue] = venueId ? await db.select().from(s.venues).where(eq(s.venues.id, venueId)) : [];
  if (venueId && !venue) return { error: "Venue not found." };
  if (capacity < 1) return { error: "Seat cap must be at least 1." };
  if (venue && capacity > venue.capacity) return { error: `Seat cap ${capacity} exceeds the capacity of ${venue.name} (${venue.capacity}).` };
  if (existing) { // audit 16 Nov 2026: never below the people already registered
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.registrationItems).innerJoin(s.registrations, eq(s.registrations.id, s.registrationItems.registrationId))
      .where(and(eq(s.registrationItems.sessionId, existing.id), inArray(s.registrations.paymentStatus, ["PENDING", "PAID", "WAIVED"])));
    if (capacity < n) return { error: `${n} people are already registered for this workshop; the seat cap cannot be lower than ${n}.` };
  }
  if (onlineLink && !/^https?:\/\/\S+$/i.test(onlineLink)) return { error: "The online link must start with https://" };
  const organiser = str(f, "organiser"), objectives = str(f, "objectives"), targetAudience = str(f, "targetAudience");
  if (!organiser) return { error: "Enter the organising person." };
  if (!objectives) return { error: "Enter the educational objectives." };
  if (!targetAudience) return { error: "Enter the target audience." };
  const facilitatorNames = (str(f, "facilitatorNames") ?? "").split(/\n/).map((x) => x.trim()).filter(Boolean).slice(0, 30);
  if (contact && !PHONE.test(contact.replace(/\s/g, ""))) return { error: "Speaker contact number must look like 0300-1234567." };

  // First come, first served: a room booked (or awaiting approval) for an overlapping time cannot be booked again
  const clash = venueId ? await roomClash(venueId, startsAt, endsAt, id) : null;
  if (clash && venue) return { error: `${venue.name} is already booked ${clash.from}–${clash.to} that day for “${clash.title}”${clash.status === "APPROVED" ? "" : " (awaiting approval)"}. Choose another time or venue.` };

  const fee = int(f, "fee"), earlyFee = str(f, "earlyFee") ? int(f, "earlyFee") : null;
  const data = {
    title, description: str(f, "description"), flyerSummary: flyerSummary ?? null, department, format: str(f, "format"),
    category: str(f, "category") === "A" ? "A" : "B", themeWeek: themeWeekOf(date, ev.themeWeeks),
    startsAt, endsAt, venueId, hall: venue ? venue.name : "Online", capacity, days, mode, onlineLink,
    organiser, objectives, targetAudience, prelimProgramme: str(f, "prelimProgramme"), facilitatorNames, fee, earlyFee, cmeHours: str(f, "cmeHours") ? Number(str(f, "cmeHours")) : null,
    leadFaculty: str(f, "leadFaculty"), facultyDegrees: str(f, "facultyDegrees"), facultyContact: contact, facultyProfile: str(f, "facultyProfile"),
    facilitators: facilitatorNames.length, volunteers: int(f, "volunteers"), technicians: int(f, "technicians"),
    equipment: parseEquipment(str(f, "equipment")),
  };

  let sid = id;
  if (existing) {
    await db.update(s.sessions).set(data).where(eq(s.sessions.id, existing.id));
    await log(existing.id, u, existing.status, existing.status, "Request edited");
  } else {
    const slug = `ws-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50)}-${Math.random().toString(36).slice(2, 6)}`;
    const [row] = await db.insert(s.sessions).values({
      ...data, proposedTitle: title, slug, type: "WORKSHOP", day: 0, registrable: true, status: "SUBMITTED", submittedAt: new Date(), proposedById: u.sub,
    }).returning({ id: s.sessions.id });
    sid = row.id;
    await log(sid, u, null, "SUBMITTED", "Form A submitted");
  }
  await db.delete(s.sessionDepartments).where(eq(s.sessionDepartments.sessionId, sid!));
  if (contributors.length) await db.insert(s.sessionDepartments).values(contributors.map((department) => ({ sessionId: sid!, department })));
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
    ...(to === "APPROVED" ? { flyerStatus: "PENDING", flyerNote: null } : {}),
    ...(decided ? { reviewedAt: new Date(), reviewedById: u.sub } : {}),
  }).where(eq(s.sessions.id, id));
  await log(id, u, w.status, to, note);
  if (decided && w.proposedById) {
    const [p] = await db.select().from(s.users).where(eq(s.users.id, w.proposedById));
    if (p) await sendTemplate(to === "APPROVED" ? "WORKSHOP_REQUEST_APPROVED" : "WORKSHOP_REQUEST_REJECTED", p.email, { name: p.name, workshop: w.title, workshop_date: fmtDate(w.startsAt), note }, { ref: w.title });
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
  // audit 16 Nov 2026: Cancel closes registration, leaves the website and tells the ticket holders; undoing it reopens registration
  await db.update(s.sessions).set({ coChairDecision: d, ...(d === "CANCEL" ? { registrable: false } : w?.coChairDecision === "CANCEL" ? { registrable: true } : {}) }).where(eq(s.sessions.id, id));
  if (d === "CANCEL" && w?.coChairDecision !== "CANCEL") {
    const holders = await db.select({ i: s.registrationItems, r: s.registrations }).from(s.registrationItems).innerJoin(s.registrations, eq(s.registrations.id, s.registrationItems.registrationId))
      .where(and(eq(s.registrationItems.sessionId, id), inArray(s.registrations.paymentStatus, ["PENDING", "PAID", "WAIVED"])));
    for (const { i, r } of holders) await sendTemplate("WORKSHOP_CANCELLED", r.email, {
      name: `${r.title} ${r.firstName} ${r.lastName}`, session_name: w!.title, session_date: fmtDate(w!.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      ticket_no: i.ticketNo ?? r.regNo, link: `${appUrl()}/register/success/${r.accessToken}`,
    }, { ref: i.ticketNo ?? r.regNo }).catch((e) => console.error("cancel notice", e));
  }
  await log(id, u, w?.status ?? null, w?.status ?? "APPROVED", `Low-fill decision: ${d}${str(f, "note") ? ` — ${str(f, "note")}` : ""}`);
  revalidatePath("/admin/workshops", "layout"); revalidatePath("/", "layout");
}

export async function deleteWorkshop(id: string) {
  const u = await requirePerm("workshops");
  const sc = await staffScope(u);
  const [w] = await db.select().from(s.sessions).where(eq(s.sessions.id, id));
  if (!w) redirect("/admin/workshops");
  const own = !sc.all && sc.departments.includes(w.department ?? "");
  if (!(can(u, "workshops.review") || (own && can(u, "workshops.submit") && !w.locked))) throw new Error("You cannot withdraw this request.");
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.registrationItems).where(eq(s.registrationItems.sessionId, id));
  if (n > 0) throw new Error("This workshop has registrations. Use the Cancel decision instead.");
  await db.delete(s.sessions).where(eq(s.sessions.id, id));
  revalidatePath("/admin/workshops", "layout"); revalidatePath("/", "layout");
  redirect("/admin/workshops?deleted=1");
}

/** Email the next people on the waitlist when seats are free. */
export async function notifyWaitlist(id: string) {
  await requirePerm("workshops.edit");
  const { notifyWaitlistFor } = await import("@/lib/seat-hold");
  await notifyWaitlistFor(id);
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
    usage: ["WORKSHOP", "SCIENTIFIC", "BOTH"].includes(str(f, "usage") ?? "") ? str(f, "usage")! : "BOTH",
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


/** Marketing department: approve the generated flyer or ask for changes. */
export async function reviewFlyer(id: string, f: FormData) {
  const u = await requirePerm("flyers");
  const to = str(f, "flyer");
  const note = str(f, "note");
  if (to !== "APPROVED" && to !== "CHANGES") throw new Error("Invalid");
  if (to === "CHANGES" && !note) redirect(`/admin/flyers?w=${id}&err=note`);
  const [w] = await db.select().from(s.sessions).where(eq(s.sessions.id, id));
  if (!w || w.type !== "WORKSHOP" || w.status !== "APPROVED") throw new Error("Not found");
  await db.update(s.sessions).set({ flyerStatus: to, flyerNote: note ?? null, flyerReviewedBy: u.name, flyerReviewedAt: new Date() }).where(eq(s.sessions.id, id));
  await log(id, u, null, to === "APPROVED" ? "FLYER_APPROVED" : "FLYER_CHANGES", note ?? (to === "APPROVED" ? "Flyer approved by Marketing" : null));
  if (to === "APPROVED" && w.proposedById) {
    const [p] = await db.select().from(s.users).where(eq(s.users.id, w.proposedById));
    if (p) await sendTemplate("WORKSHOP_FLYER_APPROVED", p.email, { name: p.name, workshop: w.title, workshop_date: fmtDate(w.startsAt), link: `${appUrl()}/workshops/${w.slug}/flyer` }, { ref: w.title });
  }
  revalidatePath("/admin/flyers"); revalidatePath(`/admin/workshops/${id}`);
  redirect(`/admin/flyers?w=${id}&saved=${to}`);
}

/** Workshop committee sends a flyer back to Marketing after fixing the record. */
export async function resubmitFlyer(id: string) {
  const u = await requirePerm("workshops.review");
  await db.update(s.sessions).set({ flyerStatus: "PENDING" }).where(eq(s.sessions.id, id));
  await log(id, u, null, "FLYER_PENDING", "Flyer resubmitted for Marketing review");
  revalidatePath(`/admin/workshops/${id}`); revalidatePath("/admin/flyers");
  redirect(`/admin/workshops/${id}`);
}
