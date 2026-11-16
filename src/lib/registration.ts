import "server-only";
import { sendTemplate } from "./email";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "./db";
import { getEvent, isEarlyBird, editionYear } from "./event";
import { nextNumber, pad } from "./counters";
import { randomToken, appUrl, pkr, fmtDate, fmtTime24, processingFee } from "./utils";
import QRCode from "qrcode";
import { qrPayload, ticketPayload } from "./qr-payload";
import { registrationPdf } from "./pdf";
import { sendMessage } from "./notify";
import { qrLink } from "./qr-link";
import { PHONE_RE, normaliseCnic } from "./reg-fields";

const opt = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

/** Basic information block of the Registration Forms 2027 (participants, guests and volunteers). */
/** Workshop support address (Final LNH Workshop Registration 2027 form). */
export const WORKSHOP_EMAIL = "workshop@symposium2027.lnh.edu.pk"; // Waqas, 16 Nov 2026

export const basicInfo = z.object({
  title: z.string().min(1, "Required").max(20),
  gender: z.enum(["Male", "Female"], { errorMap: () => ({ message: "Required" }) }),
  firstName: z.string().trim().min(1, "Required").max(60),
  lastName: z.string().trim().min(1, "Required").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  phone: z.string().trim().regex(PHONE_RE, "Use format 03XX-XXXXXXX"),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")).refine((v) => !v || PHONE_RE.test(v) || /^\+?\d[\d\s-]{7,18}$/.test(v), "Enter a valid WhatsApp number"),
  address: z.string().trim().min(5, "Required").max(250),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  province: opt(60),
  city: z.string().trim().min(2, "Required").max(60),
  cnic: z.string().trim().min(1, "Required").max(25),
  pmdcNo: opt(30),
  qualification: opt(120),
  institution: z.string().trim().min(2, "Required").max(160),
}).superRefine((d, ctx) => {
  if (!normaliseCnic(d.cnic, d.country)) ctx.addIssue({ code: "custom", path: ["cnic"], message: !d.country || /^pakistan$/i.test(d.country) ? "Enter the 13-digit CNIC (12345-1234567-1)" : "Enter your passport number" });
});

export const registrationInput = z.intersection(basicInfo, z.object({
  specialty: opt(80),
  designation: z.string().trim().min(1, "Choose your designation").max(80),
  employeeNo: opt(20),
  categoryId: z.coerce.number().int().positive(),
  sessionIds: z.array(z.string()).max(30).default([]),
  banquetQty: z.coerce.number().int().min(0).max(10).default(0),
  consent: z.literal(true, { errorMap: () => ({ message: "Please accept the terms" }) }),
  includePass: z.boolean().default(true),
}));
export type RegistrationInput = z.infer<typeof registrationInput>;

export class CapacityError extends Error {}

const LIVE = ["PENDING", "PAID", "WAIVED"] as const;

/** The delegate's registrations: first (primary) registration and the one holding a Symposium Pass, if any. */
export async function delegateStatus(accountId: string) {
  const regs = await db.select({ id: s.registrations.id, regNo: s.registrations.regNo, accessToken: s.registrations.accessToken, hasPass: s.registrations.hasPass,
    paymentStatus: s.registrations.paymentStatus, designation: s.registrations.designation, categoryId: s.registrations.categoryId, banquetQty: s.registrations.banquetQty,
    primaryRegId: s.registrations.primaryRegId, createdAt: s.registrations.createdAt })
    .from(s.registrations).where(and(eq(s.registrations.accountId, accountId), inArray(s.registrations.paymentStatus, [...LIVE]))).orderBy(asc(s.registrations.createdAt));
  const primary = regs.find((r) => !r.primaryRegId) ?? regs[0] ?? null;
  const pass = regs.find((r) => r.hasPass) ?? null;
  return { primary, pass, orders: regs };
}

export async function createRegistration(input: RegistrationInput, opts: { accountId?: string; processingFee?: boolean; silent?: boolean } = {}) {
  const ev = await getEvent();
  if (!ev.registrationOpen) throw new Error("Registration is currently closed.");
  const early = isEarlyBird(ev);
  const year = String(editionYear(ev));
  const prefix = (ev.regPrefix || "SYM").toUpperCase();
  const wantPass = input.includePass !== false;
  const ids = [...new Set(input.sessionIds)];
  if (!wantPass && !ids.length) throw new Error("Choose a Symposium Registration or at least one workshop registration.");

  const result = await db.transaction(async (tx) => {
    // workshop-only orders keep the category of the delegate's existing registration, even if that category has since been
    // switched off or its designations changed (fix 16 Nov 2026: "Invalid registration category" when adding workshops)
    const [cat] = await tx.select().from(s.feeCategory).where(wantPass ? and(eq(s.feeCategory.id, input.categoryId), eq(s.feeCategory.active, true)) : eq(s.feeCategory.id, input.categoryId));
    if (!cat) throw new Error(wantPass ? "This registration category is no longer offered. Please choose your registration again." : "Invalid registration category.");
    if (wantPass && cat.designations?.length && !cat.designations.includes(input.designation)) throw new Error(`"${input.designation}" is not in the ${cat.label} fee category.`);
    // One Symposium Pass per delegate; later orders are linked to the delegate's first registration (D1)
    let primary: { id: string; regNo: string } | null = null;
    if (opts.accountId) {
      const mine = await tx.select({ id: s.registrations.id, regNo: s.registrations.regNo, hasPass: s.registrations.hasPass, primaryRegId: s.registrations.primaryRegId })
        .from(s.registrations).where(and(eq(s.registrations.accountId, opts.accountId), inArray(s.registrations.paymentStatus, [...LIVE]))).orderBy(asc(s.registrations.createdAt)).for("update");
      const held = mine.find((r) => r.hasPass);
      if (wantPass && held) throw new Error(`You already hold a Symposium Registration (${held.regNo}). Add Pre-Symposium Workshops only, or open My Registration to pay or view it.`);
      primary = mine.find((r) => !r.primaryRegId) ?? mine[0] ?? null;
    }
    // Extra banquet passes (one is included with every pass, D3); none with workshop-only orders
    const banquetQty = wantPass ? Math.max(0, Math.min(ev.banquetMax, input.banquetQty || 0)) : 0;
    // Only workshop tickets are booked as items: scientific and plenary sessions are covered by the pass
    const sess = ids.length
      ? await tx.select({ id: s.sessions.id, title: s.sessions.title, type: s.sessions.type, startsAt: s.sessions.startsAt, capacity: s.sessions.capacity, fee: s.sessions.fee, registrable: s.sessions.registrable, status: s.sessions.status })
          .from(s.sessions).where(inArray(s.sessions.id, ids)).for("update")
      : [];
    if (sess.length !== ids.length || sess.some((x) => x.type !== "WORKSHOP" || !x.registrable || x.status !== "APPROVED")) throw new Error("One or more selected workshops are not open for registration.");
    if (opts.accountId && sess.length) {
      const dup = await tx.select({ t: s.sessions.title }).from(s.registrationItems)
        .innerJoin(s.registrations, eq(s.registrations.id, s.registrationItems.registrationId)).innerJoin(s.sessions, eq(s.sessions.id, s.registrationItems.sessionId))
        .where(and(eq(s.registrations.accountId, opts.accountId), inArray(s.registrations.paymentStatus, [...LIVE]), inArray(s.registrationItems.sessionId, ids)));
      if (dup.length) throw new Error(`You already have a ticket for "${dup[0].t}". Remove it to continue.`);
    }
    for (const x of sess) {
      if (x.capacity == null) continue;
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.registrationItems)
        .innerJoin(s.registrations, eq(s.registrations.id, s.registrationItems.registrationId))
        .where(and(eq(s.registrationItems.sessionId, x.id), inArray(s.registrations.paymentStatus, [...LIVE])));
      if (n >= x.capacity) throw new CapacityError(`"${x.title}" is full. Please remove it to continue.`);
    }
    // Early-bird pricing applies to the Symposium Pass only; workshops have one price (D2)
    const conferenceFee = wantPass ? (early ? cat.earlyFee : cat.fee) : 0;
    const items = [...sess].sort((a, b) => +a.startsAt - +b.startsAt).map((x) => ({ sessionId: x.id, fee: x.fee }));
    const banquetFee = banquetQty * ev.banquetFee;
    const subtotal = conferenceFee + banquetFee + items.reduce((a, b) => a + b.fee, 0);
    const totalFee = subtotal + processingFee(subtotal, ev.processingFeePct);

    let regNo: string;
    if (primary) {
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.registrations).where(eq(s.registrations.primaryRegId, primary.id));
      regNo = `${primary.regNo}-${n + 2}`;
    } else {
      const n = await nextNumber(`reg-${prefix}-${year}`, tx as any);
      regNo = `${prefix}-${year}-${pad(n, 5)}`;
    }
    const [reg] = await tx.insert(s.registrations).values({
      regNo, accountId: opts.accountId ?? null, accessToken: randomToken(), title: input.title, gender: input.gender, firstName: input.firstName, lastName: input.lastName,
      email: input.email, phone: input.phone, pmdcNo: input.pmdcNo || null, specialty: input.specialty || null, designation: input.designation || null,
      institution: input.institution, address: input.address || null, city: input.city || null, categoryId: cat.id,
      whatsapp: input.whatsapp || null, cnic: normaliseCnic(input.cnic, input.country), country: input.country || "Pakistan", province: input.province || null,
      qualification: input.qualification || null, employeeId: input.employeeNo || null, banquetQty, banquetFee, hasPass: wantPass, primaryRegId: primary?.id ?? null,
      conferenceFee, totalFee, earlyBird: wantPass && early, paymentStatus: totalFee === 0 ? "WAIVED" : "PENDING",
    }).returning();
    // each workshop ticket gets its own number and QR (D4)
    if (items.length) await tx.insert(s.registrationItems).values(items.map((i, n) => ({ ...i, registrationId: reg.id, ticketNo: `${regNo}-W${n + 1}` })));
    return reg;
  });

  // silent: the onsite desk takes payment (or waives) at once and sends the confirmation itself
  if (!opts.silent) await sendRegistrationNotice(result.id, "created").catch((e) => console.error("notify failed", e));
  return result;
}

/** Banquet passes held by a registration: one included with the pass plus the paid extras (D3). */
export const banquetTotal = (r: { hasPass: boolean; banquetQty: number }) => (r.hasPass ? 1 : 0) + (r.banquetQty || 0);

export async function loadRegistration(where: { id?: string; regNo?: string; accessToken?: string }) {
  const cond = where.id ? eq(s.registrations.id, where.id) : where.regNo ? eq(s.registrations.regNo, where.regNo) : eq(s.registrations.accessToken, where.accessToken!);
  return db.query.registrations.findFirst({
    where: cond,
    with: { category: true, items: { with: { session: true } }, payments: true },
  });
}

/** Email (with PDF) + SMS to the participant. kind: created | paid */
export async function sendRegistrationNotice(id: string, kind: "created" | "paid") {
  const r = await loadRegistration({ id });
  if (!r) return;
  const ev = await getEvent();
  const pdf = await registrationPdf(r, ev);
  const confirmed = r.paymentStatus === "PAID" || r.paymentStatus === "WAIVED";
  const link = `${appUrl()}/register/success/${r.accessToken}`;
  // the generated details block ({{details_html}} in the templates); every value is escaped
  const e = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const row = (l: string, v: string) => `<tr><td style="padding:6px 12px 6px 0;color:#5b6b8c;vertical-align:top">${l}</td><td>${v}</td></tr>`;
  const rows = r.items.map((i) => `<li>${e(i.session.title)} · ${fmtDate(i.session.startsAt, { weekday: "short", day: "numeric", month: "short" })}${i.session.hall ? ` · ${e(i.session.hall)}` : ""}</li>`).join("");
  const details = `<table style="width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:14px">
       ${row("Event", `${e(ev.theme)}<br>${fmtDate(ev.startDate, { day: "numeric", month: "long" })} – ${fmtDate(ev.endDate)} · ${e(ev.venue)}`)}
       ${row("Registration No.", `<b style="font-size:18px">${e(r.regNo)}</b>`)}
       ${r.hasPass ? row("Symposium Registration", `${e(r.regType === "PARTICIPANT" ? `${r.designation ?? ""} (${r.category.label})` : r.category.label)} · all symposium sessions`) + row("Banquet passes", `${banquetTotal(r)} (1 included${r.banquetQty ? ` + ${r.banquetQty} extra × ${pkr(r.banquetFee / r.banquetQty)}` : ""})`) : ""}
       ${row("Total fee", `<b>${pkr(r.totalFee)}</b>`)}
       ${row("Status", `<b style="color:${confirmed ? "#0b8a4c" : "#c47a00"}">${confirmed ? "CONFIRMED" : "PAYMENT PENDING"}</b>`)}
     </table>
     ${rows ? `<p style="margin-bottom:4px">Pre-Symposium Workshops (separate from the Symposium Registration):</p><ul style="margin-top:0">${rows}</ul><p>Please keep this confirmation with you during the workshop. Workshop questions: <a href="mailto:${WORKSHOP_EMAIL}">${WORKSHOP_EMAIL}</a></p>` : ""}`;
  const name = `${r.title} ${r.firstName} ${r.lastName}`;
  const pdfFile = { filename: `${r.regNo}.pdf`, content: pdf, contentType: "application/pdf" };
  const common = { name, reg_no: r.regNo, amount: pkr(r.totalFee), details_html: details, link, contact_phone: ev.contactPhone };
  if (!confirmed) {
    const { payByNote } = await import("./seat-hold");
    await sendTemplate("REGISTRATION_RECEIVED", r.email, { ...common, pay_by_note: await payByNote(r.id) }, { ref: r.regNo, attachments: [pdfFile] });
  } else {
    // 14.11.2026 templates: the symposium confirmation with its QR code, then one confirmation per workshop with that workshop's QR code
    const qrImg = (cid: string) => `<p style="text-align:center;margin:16px 0"><img src="cid:${cid}" width="200" height="200" alt="Your registration QR code" style="border:8px solid #ffffff"></p>`;
    const png = (data: string) => QRCode.toBuffer(data, { margin: 1, width: 400, errorCorrectionLevel: "M" });
    if (r.hasPass) {
      await sendTemplate("REGISTRATION_CONFIRMED", r.email, { ...common, qr_html: qrImg("qr-pass") }, {
        ref: r.regNo, attachments: [{ filename: `${r.regNo}-qr.png`, content: await png(qrPayload(r)), contentType: "image/png", cid: "qr-pass" }, pdfFile],
      });
    }
    const [pay] = await db.select({ ref: s.payments.providerRef, txn: s.payments.txnRef }).from(s.payments)
      .where(and(eq(s.payments.registrationId, r.id), eq(s.payments.status, "PAID"))).orderBy(sql`${s.payments.createdAt} desc`).limit(1);
    for (const i of r.items) {
      const w = i.session;
      await sendTemplate("WORKSHOP_CONFIRMED", r.email, {
        ...common, workshop: w.title, ticket_no: i.ticketNo ?? r.regNo,
        workshop_date: w.days > 1 ? `${fmtDate(w.startsAt, { weekday: "long", day: "numeric", month: "long" })} to ${fmtDate(w.endsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}` : fmtDate(w.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
        workshop_time: `${fmtTime24(w.startsAt)} – ${fmtTime24(w.endsAt)}${w.days > 1 ? " each day" : ""}`,
        venue: w.mode === "ONLINE" ? "Online" : `${w.hall ?? "To be announced"}, LNH Karachi${w.mode === "HYBRID" ? " (also online)" : ""}`,
        payment_status: r.paymentStatus === "WAIVED" ? "Complimentary" : "Paid", amount: pkr(i.fee),
        transaction_id: r.paymentStatus === "WAIVED" ? null : (pay?.ref || pay?.txn || null), department: w.department,
        qr_html: qrImg("qr-ws"),
      }, { ref: i.ticketNo ?? r.regNo, attachments: [{ filename: `${i.ticketNo ?? r.regNo}-qr.png`, content: await png(ticketPayload(r, i)), contentType: "image/png", cid: "qr-ws" }] });
    }
  }
  // WhatsApp / SMS (Admin → WhatsApp & SMS): the symposium QR and each workshop's QR go as images (public, unguessable links)
  if (!confirmed) {
    await sendMessage("REGISTRATION_RECEIVED", r.phone, { email: r.email, ref: r.regNo, text: `LNH Symposium: Dear ${r.firstName}, registration ${r.regNo} received. Please pay ${pkr(r.totalFee)} to confirm: ${link}` });
  } else {
    if (r.hasPass || !r.items.length) await sendMessage("REGISTRATION_CONFIRMED", r.phone, { email: r.email, ref: r.regNo, mediaUrl: qrLink("r", r.id),
      text: `LNH Symposium: Dear ${r.firstName}, your registration ${r.regNo} is CONFIRMED. Fee ${pkr(r.totalFee)} received. See you on ${fmtDate(ev.startDate, { day: "numeric", month: "short" })}.` });
    for (const i of r.items) await sendMessage("WORKSHOP_CONFIRMED", r.phone, { email: r.email, ref: i.ticketNo ?? r.regNo, mediaUrl: qrLink("t", i.id),
      text: r.hasPass ? undefined : `LNH Symposium: Dear ${r.firstName}, workshop "${i.session.title.slice(0, 60)}" is CONFIRMED (${i.ticketNo ?? r.regNo}).` });
  }
}
