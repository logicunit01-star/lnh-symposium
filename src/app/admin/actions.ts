"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { markPaidManually } from "@/lib/payments";
import { sendRegistrationNotice } from "@/lib/registration";
import { issueCertificates } from "@/lib/certificates";
import { sendEmail, sendSms, emailLayout } from "@/lib/notify";

const str = (f: FormData, k: string) => { const v = f.get(k); return v == null || v === "" ? null : String(v).trim(); };
const num = (f: FormData, k: string) => { const v = str(f, k); return v == null ? null : Number(v); };
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

// ---------------- registrations ----------------
export async function regMarkPaid(id: string, f: FormData) {
  await requirePerm("registrations.edit");
  await markPaidManually(id, str(f, "method") || "Cash at desk", str(f, "ref") || undefined);
  revalidatePath(`/admin/registrations/${id}`);
}
export async function regSetStatus(id: string, status: "WAIVED" | "PENDING" | "REFUNDED" | "FAILED") {
  await requirePerm("registrations.edit");
  await db.update(s.registrations).set({ paymentStatus: status, paidAt: status === "WAIVED" ? new Date() : undefined }).where(eq(s.registrations.id, id));
  if (status === "WAIVED") await sendRegistrationNotice(id, "paid");
  revalidatePath(`/admin/registrations/${id}`);
}
export async function regResend(id: string) {
  await requirePerm("registrations.edit");
  await sendRegistrationNotice(id, "created");
  revalidatePath(`/admin/registrations/${id}`);
}
export async function regNotes(id: string, f: FormData) {
  await requirePerm("registrations.edit");
  await db.update(s.registrations).set({ notes: str(f, "notes") }).where(eq(s.registrations.id, id));
  revalidatePath(`/admin/registrations/${id}`);
}
export async function regCheckIn(id: string, undo = false) {
  await requirePerm("checkin");
  await db.update(s.registrations).set({ checkedInAt: undo ? null : new Date() }).where(eq(s.registrations.id, id));
  revalidatePath("/admin/checkin"); revalidatePath(`/admin/registrations/${id}`);
}
export async function itemAttend(itemId: string, undo = false) {
  await requirePerm("checkin");
  const [it] = await db.update(s.registrationItems).set({ attendedAt: undo ? null : new Date() }).where(eq(s.registrationItems.id, itemId)).returning();
  if (!undo && it) await db.update(s.registrations).set({ checkedInAt: new Date() }).where(and(eq(s.registrations.id, it.registrationId)));
  revalidatePath("/admin/checkin"); revalidatePath(`/admin/sessions/${it?.sessionId}`);
}

// ---------------- sessions ----------------
export async function saveSession(id: string | null, f: FormData) {
  await requirePerm("sessions.edit");
  const day = num(f, "day") ?? 1;
  const date = str(f, "date")!; // yyyy-mm-dd
  const at = (t: string) => new Date(`${date}T${t}:00+05:00`);
  const title = str(f, "title")!;
  const data = {
    type: str(f, "type") as any, title, description: str(f, "description"), track: str(f, "track"), day,
    startsAt: at(str(f, "start")!), endsAt: at(str(f, "end")!), hall: str(f, "hall"), capacity: num(f, "capacity"),
    fee: num(f, "fee") ?? 0, earlyFee: num(f, "earlyFee"), registrable: bool(f, "registrable"),
    department: str(f, "department"), format: str(f, "format"), status: str(f, "status") || "APPROVED", feedbackOpen: bool(f, "feedbackOpen"), cmeHours: num(f, "cmeHours"),
  };
  let sid = id;
  if (id) await db.update(s.sessions).set(data).where(eq(s.sessions.id, id));
  else {
    const slug = `d${day}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50)}-${Math.random().toString(36).slice(2, 6)}`;
    [{ id: sid }] = await db.insert(s.sessions).values({ ...data, slug }).returning({ id: s.sessions.id }) as any;
  }
  const speakerIds = f.getAll("speakers").map(String);
  await db.delete(s.sessionSpeakers).where(eq(s.sessionSpeakers.sessionId, sid!));
  if (speakerIds.length) await db.insert(s.sessionSpeakers).values(speakerIds.map((sp) => ({ sessionId: sid!, speakerId: sp, role: str(f, `role_${sp}`) || "Speaker" })));
  revalidatePath("/admin/sessions"); revalidatePath("/", "layout");
  redirect(`/admin/sessions/${sid}`);
}
export async function deleteSession(id: string) {
  await requirePerm("sessions.edit");
  try { await db.delete(s.sessions).where(eq(s.sessions.id, id)); }
  catch { throw new Error("This session has registrations and cannot be deleted. Set it to non-registrable instead."); }
  revalidatePath("/admin/sessions"); redirect("/admin/sessions");
}

// ---------------- abstracts ----------------
export async function reviewAbstract(id: string, f: FormData) {
  const u = await requirePerm("abstracts.review");
  const status = str(f, "status") as any;
  const notify = bool(f, "notify");
  const [a] = await db.update(s.abstracts).set({ status, score: num(f, "score"), reviewerNotes: str(f, "reviewerNotes"), reviewerId: str(f, "reviewerId") ?? u.sub }).where(eq(s.abstracts.id, id)).returning();
  if (notify && ["ACCEPTED", "REJECTED", "REVISION"].includes(status)) {
    const msg = { ACCEPTED: "We are pleased to inform you that your abstract has been <b>accepted</b>", REJECTED: "We regret to inform you that your abstract could not be accepted", REVISION: "The scientific committee has requested a <b>revision</b> of your abstract" }[status as "ACCEPTED"];
    await sendEmail(a.email, `Abstract ${a.refNo} — decision`, emailLayout("Abstract decision", `<p>Dear ${a.title} ${a.firstName} ${a.lastName},</p><p>${msg} (<b>${a.refNo}</b> — “${a.abstractTitle}”).</p>${status === "ACCEPTED" ? `<p>Accepted as: <b>${a.type === "ORAL" ? "Oral presentation" : "Poster"}</b>. Please ensure the presenting author registers for the symposium.</p>` : ""}`));
    await sendSms(a.mobile, `LNH Symposium: A decision on abstract ${a.refNo} has been emailed to you.`);
  }
  revalidatePath(`/admin/abstracts/${id}`); revalidatePath("/admin/abstracts");
}

// ---------------- content ----------------
export async function saveSpeaker(id: string | null, f: FormData) {
  await requirePerm("content");
  const data = { title: str(f, "title"), name: str(f, "name")!, designation: str(f, "designation"), institution: str(f, "institution"), country: str(f, "country"), bio: str(f, "bio"), topic: str(f, "topic"), photoUrl: str(f, "photoUrl"), linkedin: str(f, "linkedin"), featured: bool(f, "featured"), order: num(f, "order") ?? 0 };
  if (id) await db.update(s.speakers).set(data).where(eq(s.speakers.id, id)); else await db.insert(s.speakers).values(data);
  revalidatePath("/admin/content"); revalidatePath("/", "layout");
}
export async function deleteSpeaker(id: string) { await requirePerm("content"); await db.delete(s.speakers).where(eq(s.speakers.id, id)); revalidatePath("/admin/content"); }
export async function saveMember(id: string | null, f: FormData) {
  await requirePerm("content");
  const data = { name: str(f, "name")!, role: str(f, "role")!, designation: str(f, "designation"), department: str(f, "department"), group: str(f, "group") || "Organizing Committee", photoUrl: str(f, "photoUrl"), order: num(f, "order") ?? 0 };
  if (id) await db.update(s.committee).set(data).where(eq(s.committee.id, id)); else await db.insert(s.committee).values(data);
  revalidatePath("/admin/content"); revalidatePath("/committee");
}
export async function deleteMember(id: string) { await requirePerm("content"); await db.delete(s.committee).where(eq(s.committee.id, id)); revalidatePath("/admin/content"); }

// ---------------- settings ----------------
export async function saveSettings(f: FormData) {
  await requirePerm("settings");
  const d = (k: string) => { const v = str(f, k); return v ? new Date(`${v}:00+05:00`) : null; };
  await db.update(s.event).set({
    edition: str(f, "edition")!, name: str(f, "name")!, theme: str(f, "theme")!, tagline: str(f, "tagline") || "",
    mainTheme: str(f, "mainTheme") || "", eventDays: (str(f, "eventDays") || "").split(/[\s,]+/).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
    regPrefix: (str(f, "regPrefix") || "SYM").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "SYM", processingFeePct: num(f, "processingFeePct") ?? 0,
    startDate: d("startDate")!, endDate: d("endDate")!, venue: str(f, "venue")!, virtualLink: str(f, "virtualLink"), heroVideoUrl: str(f, "heroVideoUrl"),
    registrationOpen: bool(f, "registrationOpen"), earlyBirdUntil: d("earlyBirdUntil"), abstractOpen: d("abstractOpen"), abstractDeadline: d("abstractDeadline"),
    abstractWordLimit: num(f, "abstractWordLimit") ?? 300, contactEmail: str(f, "contactEmail")!, contactPhone: str(f, "contactPhone")!,
    facebook: str(f, "facebook"), instagram: str(f, "instagram"), linkedin: str(f, "linkedin"), youtube: str(f, "youtube"), x: str(f, "x"),
    videos: (str(f, "videos") || "").split(/\s+/).filter(Boolean),
    workshopStart: d("workshopStart"), workshopEnd: d("workshopEnd"),
    themeWeeks: (str(f, "themeWeeks") || "").split(/\n/).map((l) => l.match(/^\s*(\d{4}-\d{2}-\d{2})\s*[,|]\s*(.+?)\s*$/)).filter(Boolean).map((m) => ({ from: m![1], label: m![2] })),
    seatTarget: num(f, "seatTarget") ?? 3000, usdRate: num(f, "usdRate") ?? 280,
  }).where(eq(s.event.id, 1));
  revalidatePath("/", "layout");
}
export async function saveFee(id: number | null, f: FormData) {
  await requirePerm("settings");
  const data = { code: str(f, "code")!.toUpperCase(), label: str(f, "label")!, fee: num(f, "fee") ?? 0, earlyFee: num(f, "earlyFee") ?? 0, note: str(f, "note"), order: num(f, "order") ?? 0, active: bool(f, "active"), tier: str(f, "tier") || "GENERAL" };
  if (id) await db.update(s.feeCategory).set(data).where(eq(s.feeCategory.id, id)); else await db.insert(s.feeCategory).values(data);
  revalidatePath("/admin/settings"); revalidatePath("/register");
}

// ---------------- users ----------------
export async function saveUser(id: string | null, f: FormData) {
  await requirePerm("users");
  const pw = str(f, "password");
  const data: any = { name: str(f, "name")!, email: str(f, "email")!.toLowerCase(), role: str(f, "role") as any, department: str(f, "department"), active: bool(f, "active") };
  if (pw) { if (pw.length < 8) throw new Error("Password must be at least 8 characters"); data.passwordHash = await bcrypt.hash(pw, 10); }
  if (id) await db.update(s.users).set(data).where(eq(s.users.id, id));
  else { if (!pw) throw new Error("Password required for new users"); await db.insert(s.users).values(data); }
  revalidatePath("/admin/users");
}

// ---------------- messages ----------------
export async function toggleMessage(id: string, handled: boolean) {
  await requirePerm("messages");
  await db.update(s.contactMessages).set({ handled }).where(eq(s.contactMessages.id, id));
  revalidatePath("/admin/messages");
}

// ---------------- communications ----------------
export async function issueCerts(f: FormData) {
  await requirePerm("certificates");
  const n = await issueCertificates({ attendedOnly: bool(f, "attendedOnly"), notify: bool(f, "notify") });
  revalidatePath("/admin/communications");
  redirect(`/admin/communications?issued=${n}`);
}
export async function broadcast(f: FormData) {
  await requirePerm("notifications");
  const { audienceRecipients } = await import("@/lib/broadcast");
  const list = await audienceRecipients(str(f, "audience") || "PAID", str(f, "sessionId"));
  const subject = str(f, "subject")!, body = str(f, "body")!, sms = str(f, "sms");
  const channels = f.getAll("channel").map(String);
  for (const r of list) {
    if (channels.includes("EMAIL")) await sendEmail(r.email, subject, emailLayout(subject, `<p>Dear ${r.title} ${r.firstName} ${r.lastName},</p>${body.split(/\n{2,}/).map((p) => `<p>${p.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`).join("")}<p style="color:#5b6b8c;font-size:13px">Registration No. ${r.regNo}</p>`));
    if (channels.includes("SMS") && sms) await sendSms(r.phone, sms.replace("{name}", r.firstName).replace("{regNo}", r.regNo));
  }
  redirect(`/admin/communications?sent=${list.length}`);
}

export async function resetDemoContent() {
  const u = await requirePerm("settings");
  if (u.role !== "SUPER_ADMIN") throw new Error("Only a Super Admin can reset demo content.");
  const { seedDemoContent } = await import("@/lib/demo-content");
  await seedDemoContent(db, { reset: true });
  revalidatePath("/", "layout");
  redirect("/admin/settings?reset=1");
}
