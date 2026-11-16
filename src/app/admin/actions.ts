"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { markPaidManually } from "@/lib/payments";
import { sendRegistrationNotice } from "@/lib/registration";
import { issueCertificates } from "@/lib/certificates";
import { sendEmail, emailLayout } from "@/lib/notify";
import { staffLog } from "@/lib/staff-audit";
import { HOME_TEXT } from "@/lib/event";

const str = (f: FormData, k: string) => { const v = f.get(k); return v == null || v === "" ? null : String(v).trim(); };
const num = (f: FormData, k: string) => { const v = str(f, k); return v == null ? null : Number(v); };
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

// ---------------- registrations ----------------
// audit 16 Nov 2026: every payment / fee change records who made it (Users & roles change log, shown on the registration)
const regLabel = async (id: string) => { const [r] = await db.select({ regNo: s.registrations.regNo }).from(s.registrations).where(eq(s.registrations.id, id)); return { id, label: `Registration ${r?.regNo ?? id}` }; };
export async function regMarkPaid(id: string, f: FormData) {
  const me = await requirePerm("registrations.edit");
  const [r] = await db.select({ st: s.registrations.paymentStatus }).from(s.registrations).where(eq(s.registrations.id, id));
  // a second click (or a colleague at the same time) must not record a second payment or send the confirmation twice
  if (!r || r.st === "PAID" || r.st === "WAIVED") redirect(`/admin/registrations/${id}?err=already`);
  const method = str(f, "method") || "Cash at desk", ref = str(f, "ref");
  await markPaidManually(id, method, ref || undefined, `${me.name} (${me.email})`);
  await staffLog(me, await regLabel(id), "Marked paid", `${method}${ref ? `, ref ${ref}` : ""}`);
  revalidatePath(`/admin/registrations/${id}`);
}
const STATUS_LABEL = { WAIVED: "Fee waived", PENDING: "Re-opened (payment pending)", REFUNDED: "Marked refunded", FAILED: "Cancelled (seats freed)" } as const;
export async function regSetStatus(id: string, status: "WAIVED" | "PENDING" | "REFUNDED" | "FAILED", f?: FormData) {
  const me = await requirePerm("registrations.edit");
  const [r] = await db.select({ st: s.registrations.paymentStatus }).from(s.registrations).where(eq(s.registrations.id, id));
  if (!r) redirect("/admin/registrations");
  const allowed: Record<string, string[]> = { WAIVED: ["PENDING", "FAILED"], REFUNDED: ["PAID"], FAILED: ["PENDING"], PENDING: ["FAILED", "REFUNDED"] };
  if (!allowed[status].includes(r.st)) redirect(`/admin/registrations/${id}?err=status`);
  await db.update(s.registrations).set({ paymentStatus: status, ...(status === "WAIVED" ? { paidAt: new Date(), paymentMethod: "Waived" } : status === "PENDING" ? { paidAt: null } : {}) }).where(eq(s.registrations.id, id));
  await staffLog(me, await regLabel(id), STATUS_LABEL[status], f ? str(f, "reason") : null);
  if (status === "WAIVED") await sendRegistrationNotice(id, "paid");
  revalidatePath(`/admin/registrations/${id}`);
}
/** A flagged payment (duplicate, late, short) was handled outside the portal (refund, difference collected): clears the flag. */
export async function payResolve(payId: string, f: FormData) {
  const me = await requirePerm("registrations.edit");
  const [p] = await db.select().from(s.payments).where(eq(s.payments.id, payId));
  if (!p?.flag) return;
  const note = str(f, "note") || "resolved";
  await db.update(s.payments).set({ flag: null, flagNote: `${p.flag} resolved by ${me.name}: ${note}` }).where(eq(s.payments.id, payId));
  await staffLog(me, await regLabel(p.registrationId), "Payment flag resolved", `${p.txnRef} ${p.flag}: ${note}`);
  revalidatePath(`/admin/registrations/${p.registrationId}`); revalidatePath("/admin/payments");
}
export async function regResend(id: string) {
  const me = await requirePerm("registrations.edit");
  // resend what matches the current status (the confirmation with QR codes once paid)
  const [r] = await db.select({ st: s.registrations.paymentStatus }).from(s.registrations).where(eq(s.registrations.id, id));
  await sendRegistrationNotice(id, r?.st === "PAID" || r?.st === "WAIVED" ? "paid" : "created");
  await staffLog(me, await regLabel(id), "Confirmation resent");
  revalidatePath(`/admin/registrations/${id}`);
}
export async function regNotes(id: string, f: FormData) {
  await requirePerm("registrations.edit");
  await db.update(s.registrations).set({ notes: str(f, "notes") }).where(eq(s.registrations.id, id));
  revalidatePath(`/admin/registrations/${id}`);
}
/** Why someone may not enter: unpaid, not approved (guest / volunteer), or no symposium registration. null = may enter. */
async function entryBlock(regId: string, forSymposium: boolean) {
  const [r] = await db.select({ st: s.registrations.paymentStatus, t: s.registrations.regType, a: s.registrations.approvalStatus, pass: s.registrations.hasPass }).from(s.registrations).where(eq(s.registrations.id, regId));
  if (!r) return "notfound";
  if (r.t !== "PARTICIPANT" && r.a !== "APPROVED") return "approval";
  if (r.st !== "PAID" && r.st !== "WAIVED") return "unpaid";
  if (forSymposium && !r.pass) return "nopass";
  return null;
}
const backTo = async (from: string | undefined, id: string, q: string) => {
  if (from !== "checkin") redirect(`/admin/registrations/${id}?${q}`);
  const [r] = await db.select({ regNo: s.registrations.regNo }).from(s.registrations).where(eq(s.registrations.id, id));
  redirect(`/admin/checkin?q=${encodeURIComponent(r?.regNo ?? "")}&${q}`);
};
export async function regCheckIn(id: string, undo = false, from?: string) {
  await requirePerm("checkin");
  // audit 16 Nov 2026: the server checks payment, approval and the symposium registration, not only the button
  if (!undo) { const b = await entryBlock(id, true); if (b) await backTo(from, id, `err=${b}`); }
  await db.update(s.registrations).set({ checkedInAt: undo ? null : new Date() }).where(eq(s.registrations.id, id));
  revalidatePath("/admin/checkin"); revalidatePath(`/admin/registrations/${id}`);
}
export async function itemAttend(itemId: string, undo = false, from?: string) {
  await requirePerm("checkin");
  const [it0] = await db.select().from(s.registrationItems).where(eq(s.registrationItems.id, itemId));
  if (!it0) return;
  if (!undo) { const b = await entryBlock(it0.registrationId, false); if (b) await backTo(from, it0.registrationId, `err=${b}`); }
  // workshop attendance only: it no longer checks the person in to the symposium
  await db.update(s.registrationItems).set({ attendedAt: undo ? null : new Date() }).where(eq(s.registrationItems.id, itemId));
  revalidatePath("/admin/checkin"); revalidatePath(`/admin/sessions/${it0.sessionId}`); revalidatePath(`/admin/registrations/${it0.registrationId}`);
}

// ---------------- sessions ----------------
export async function saveSession(id: string | null, f: FormData) {
  await requirePerm("sessions.edit");
  const bad = (m: string) => redirect(`/admin/sessions/${id ? `${id}/edit` : "new"}?err=${encodeURIComponent(m)}`);
  // audit 16 Nov 2026: workshops and department sessions are changed only in their own editors
  const [old] = id ? await db.select().from(s.sessions).where(eq(s.sessions.id, id)) : [];
  if (old && (old.type === "WORKSHOP" || old.proposal)) return bad("Workshops and department sessions are edited in Workshop Programme / Scientific Programme.");
  if (str(f, "type") === "WORKSHOP") return bad("Workshops are requested through Workshop Programme (Form A).");
  const day = num(f, "day") ?? 1;
  const date = str(f, "date") ?? ""; // yyyy-mm-dd
  const at = (t: string) => new Date(`${date}T${t}:00+05:00`);
  const title = str(f, "title") ?? "";
  if (title.length < 3) return bad("Enter the session title.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(+at(str(f, "start") ?? "")) || isNaN(+at(str(f, "end") ?? ""))) return bad("Enter a valid date, start and end time.");
  if (+at(str(f, "end")!) <= +at(str(f, "start")!)) return bad("The end time must be after the start time.");
  const dept = str(f, "department");
  if (dept) { const [d] = await db.select({ n: s.departments.name }).from(s.departments).where(eq(s.departments.name, dept)); if (!d) return bad("Choose the department from the list."); }
  if (id && num(f, "capacity") != null) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.registrationItems).innerJoin(s.registrations, eq(s.registrations.id, s.registrationItems.registrationId))
      .where(and(eq(s.registrationItems.sessionId, id), inArray(s.registrations.paymentStatus, ["PENDING", "PAID", "WAIVED"])));
    if (num(f, "capacity")! < n) return bad(`${n} people are already registered; the capacity cannot be lower.`);
  }
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
  const [x] = await db.select({ t: s.sessions.type, p: s.sessions.proposal }).from(s.sessions).where(eq(s.sessions.id, id));
  if (x && (x.t === "WORKSHOP" || x.p)) throw new Error("Workshops and department sessions are withdrawn in Workshop Programme / Scientific Programme.");
  try { await db.delete(s.sessions).where(eq(s.sessions.id, id)); }
  catch { throw new Error("This session has registrations and cannot be deleted. Set it to non-registrable instead."); }
  revalidatePath("/admin/sessions"); redirect("/admin/sessions");
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
  const me = await requirePerm("settings");
  for (const [k, v] of [...f.entries()]) {
    if (k.startsWith("tplfile_del_") && v === "on") await db.delete(s.agendaTemplateFiles).where(eq(s.agendaTemplateFiles.format, k.slice(12)));
    if (k.startsWith("tplfile_") && !k.startsWith("tplfile_del_") && typeof v === "object" && v && (v as File).size > 0) {
      const file = v as File;
      if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is larger than 5 MB.`);
      const row = { format: k.slice(8), fileName: file.name.slice(0, 160), mime: file.type || "application/octet-stream", size: file.size, data: Buffer.from(await file.arrayBuffer()).toString("base64"), uploadedBy: me.name, uploadedAt: new Date() };
      await db.insert(s.agendaTemplateFiles).values(row).onConflictDoUpdate({ target: s.agendaTemplateFiles.format, set: row });
    }
  }
  const d = (k: string) => { const v = str(f, k); return v ? new Date(`${v}:00+05:00`) : null; };
  await db.update(s.event).set({
    edition: str(f, "edition")!, name: str(f, "name")!, theme: str(f, "theme")!, tagline: str(f, "tagline") || "",
    mainTheme: str(f, "mainTheme") || "", eventDays: (str(f, "eventDays") || "").split(/[\s,]+/).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
    regPrefix: (str(f, "regPrefix") || "SYM").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "SYM", processingFeePct: num(f, "processingFeePct") ?? 0,
    startDate: d("startDate")!, endDate: d("endDate")!, venue: str(f, "venue")!, virtualLink: str(f, "virtualLink"), heroVideoUrl: str(f, "heroVideoUrl"),
    registrationOpen: bool(f, "registrationOpen"), earlyBirdUntil: d("earlyBirdUntil"), abstractOpen: d("abstractOpen"), abstractDeadline: d("abstractDeadline"),
    abstractWordLimit: num(f, "abstractWordLimit") ?? 300, contactEmail: str(f, "contactEmail")!, contactPhone: str(f, "contactPhone")!,
    facebook: str(f, "facebook"), instagram: str(f, "instagram"), linkedin: str(f, "linkedin"), youtube: str(f, "youtube"), x: str(f, "x"), whatsapp: str(f, "whatsapp"),
    ...(/^[A-Za-z0-9]{8,40}$/.test(str(f, "guestCode") ?? "") ? { guestCode: str(f, "guestCode") } : {}),
    videos: (str(f, "videos") || "").split(/\s+/).filter(Boolean),
    homeText: Object.fromEntries(Object.keys(HOME_TEXT).map((k) => [k, (str(f, `ht_${k}`) || "").slice(0, 300)]).filter(([, v]) => v)),
    tickerItems: (str(f, "tickerItems") || "").split(/\n/).map((l) => l.trim()).filter(Boolean).slice(0, 12),
    galleryUrl: str(f, "galleryUrl"), galleryThumbUrl: str(f, "galleryThumbUrl"),
    agendaLive: bool(f, "agendaLive"), speakersLive: bool(f, "speakersLive"),
    workshopStart: d("workshopStart"), workshopEnd: d("workshopEnd"),
    themeWeeks: (str(f, "themeWeeks") || "").split(/\n/).map((l) => l.match(/^\s*(\d{4}-\d{2}-\d{2})\s*[,|]\s*(.+?)\s*$/)).filter(Boolean).map((m) => ({ from: m![1], label: m![2] })),
    seatTarget: num(f, "seatTarget") ?? 3000, usdRate: num(f, "usdRate") ?? 280, seatHoldHours: Math.max(0, Math.min(720, num(f, "seatHoldHours") ?? 72)),
    sessionSlots: (str(f, "sessionSlots") || "").split(/\n/).map((l) => l.match(/^\s*(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})((?:\s+(?:optional|plenary|debate))*)\s*$/i)).filter(Boolean)
      .map((m) => { const tags = (m![4] || "").toLowerCase(); return { key: `${m![1]}|${m![2]}`, day: m![1], start: m![2], end: m![3], optional: tags.includes("optional"), ...(tags.includes("plenary") ? { special: "PLENARY" as const } : tags.includes("debate") ? { special: "DEBATE" as const } : {}) }; })
      .sort((a, b) => a.key.localeCompare(b.key)),
    abstractP1Open: d("abstractP1Open"), abstractP1Close: d("abstractP1Close"), abstractP2Open: d("abstractP2Open"), abstractP2Close: d("abstractP2Close"),
    sciLockAt: d("sciLockAt"), qcGuidelines: str(f, "qcGuidelines"),
    abstractConfirmBy: d("abstractConfirmBy"), scheduleUpdateBy: d("scheduleUpdateBy"), presenterRegBy: d("presenterRegBy"), scEmail: str(f, "scEmail"),
    banquetFee: Math.max(0, num(f, "banquetFee") ?? 4000), banquetMax: Math.max(0, Math.min(10, num(f, "banquetMax") ?? 2)),
    emailFrom: str(f, "emailFrom"), emailCc: str(f, "emailCc"),
    agendaTemplates: Object.fromEntries([...f.entries()].filter(([k]) => k.startsWith("tpl_")).map(([k, v]) => [k.slice(4), String(v)])),
  }).where(eq(s.event.id, 1));
  revalidatePath("/", "layout");
}
export async function saveFee(id: number | null, f: FormData) {
  await requirePerm("settings");
  const data = { code: str(f, "code")!.toUpperCase(), label: str(f, "label")!, fee: num(f, "fee") ?? 0, earlyFee: num(f, "earlyFee") ?? 0, note: str(f, "note"), order: num(f, "order") ?? 0, active: bool(f, "active"),
    designations: (str(f, "designations") || "").split(",").map((x) => x.trim()).filter(Boolean) };
  if (id) await db.update(s.feeCategory).set(data).where(eq(s.feeCategory.id, id)); else await db.insert(s.feeCategory).values(data);
  revalidatePath("/admin/settings"); revalidatePath("/register");
}

// ---------------- users ----------------
// Users & roles: see users/actions.ts (15 Nov 2026)

// ---------------- messages ----------------
export async function toggleMessage(id: string, handled: boolean) {
  await requirePerm("messages");
  await db.update(s.contactMessages).set({ handled }).where(eq(s.contactMessages.id, id));
  revalidatePath("/admin/messages");
}

// ---------------- communications ----------------
export async function issueCerts(f: FormData) {
  const me = await requirePerm("certificates");
  const { getEvent, beforeEventEnd } = await import("@/lib/event");
  if (beforeEventEnd(await getEvent()) && !bool(f, "early")) redirect("/admin/communications?err=early");
  const n = await issueCertificates({ attendedOnly: bool(f, "attendedOnly"), notify: bool(f, "notify") });
  await staffLog(me, { label: "Symposium certificates" }, "Certificates issued", `${n} certificate(s)${bool(f, "attendedOnly") ? ", checked-in only" : ""}`);
  revalidatePath("/admin/communications");
  redirect(`/admin/communications?issued=${n}`);
}
export async function broadcast(f: FormData) {
  const me = await requirePerm("notifications");
  if (f.get("confirm") !== "on") redirect("/admin/communications?err=confirm");
  const { audienceRecipients } = await import("@/lib/broadcast");
  const list = await audienceRecipients(str(f, "audience") || "PAID", str(f, "sessionId"));
  const subject = str(f, "subject")!, body = str(f, "body")!;
  const channels = ["EMAIL"]; // free-text SMS removed (16 Nov 2026): xNotify sends fixed templates only
  // sender settings of "Messages from staff" (Automated emails), 14 Nov 2026
  const { senderFor } = await import("@/lib/email");
  const snd = await senderFor("BROADCAST");
  // audit 16 Nov 2026: everything is queued under one batch reference and sent in steps (no time-out on Vercel);
  // names typed by participants are escaped before they go into the email
  const batch = `BROADCAST-${Date.now().toString(36).toUpperCase()}`;
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = (r: { title: string | null; firstName: string; lastName: string }) => emailLayout(esc(subject), `<p>Dear ${esc(`${r.title ?? ""} ${r.firstName} ${r.lastName}`.trim())},</p>${body.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}`);
  for (const r of list) {
    if (channels.includes("EMAIL")) await sendEmail(r.email, subject, html(r), [], { from: snd.from, fromName: snd.fromName, accountId: snd.accountId, cc: null, replyTo: snd.replyTo, fallbackReplyTo: snd.fallbackReplyTo, templateKey: "BROADCAST", ref: batch, defer: true });
  }
  await staffLog(me, { label: `Message to ${list.length} registrant(s)` }, "Message sent", `${batch}: “${subject}” by ${channels.join(" + ")}`);
  redirect(`/admin/communications?batch=${batch}&sent=${list.length}`);
}

export async function resetDemoContent() {
  const u = await requirePerm("settings");
  if (u.role !== "SUPER_ADMIN") throw new Error("Only a Super Admin can reset demo content.");
  // audit 16 Nov 2026: it deletes registrations and the programme, so it only exists where the server allows it (test sites)
  if (process.env.ALLOW_DEMO_RESET !== "1") throw new Error("Resetting demo content is switched off on this server.");
  const { seedDemoContent } = await import("@/lib/demo-content");
  await seedDemoContent(db, { reset: true });
  revalidatePath("/", "layout");
  redirect("/admin/settings?reset=1");
}
