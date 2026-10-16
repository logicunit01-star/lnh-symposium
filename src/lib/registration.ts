import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "./db";
import { getEvent, isEarlyBird, editionYear } from "./event";
import { nextNumber, pad } from "./counters";
import { randomToken, appUrl, pkr, fmtDate, processingFee } from "./utils";
import { registrationPdf } from "./pdf";
import { sendEmail, sendSms, emailLayout } from "./notify";

export const registrationInput = z.object({
  title: z.string().min(1).max(20),
  gender: z.enum(["Male", "Female"]),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().regex(/^(\+92|0092|0)?3\d{2}[- ]?\d{7}$/, "Use format 03XX-XXXXXXX"),
  pmdcNo: z.string().trim().max(30).optional().or(z.literal("")),
  specialty: z.string().trim().max(80).optional().or(z.literal("")),
  designation: z.string().trim().max(80).optional().or(z.literal("")),
  institution: z.string().trim().min(2).max(160),
  address: z.string().trim().max(250).optional().or(z.literal("")),
  city: z.string().trim().max(60).optional().or(z.literal("")),
  categoryId: z.coerce.number().int().positive(),
  sessionIds: z.array(z.string()).max(30).default([]),
  consent: z.literal(true, { errorMap: () => ({ message: "Please accept the terms" }) }),
  includePass: z.boolean().default(true),
});
export type RegistrationInput = z.infer<typeof registrationInput>;

export class CapacityError extends Error {}

export async function createRegistration(input: RegistrationInput, opts: { accountId?: string; processingFee?: boolean } = {}) {
  const ev = await getEvent();
  if (!ev.registrationOpen) throw new Error("Registration is currently closed.");
  const early = isEarlyBird(ev);
  const year = String(editionYear(ev));
  const prefix = (ev.regPrefix || "SYM").toUpperCase();

  const result = await db.transaction(async (tx) => {
    const [cat] = await tx.select().from(s.feeCategory).where(and(eq(s.feeCategory.id, input.categoryId), eq(s.feeCategory.active, true)));
    if (!cat) throw new Error("Invalid registration category.");
    const ids = [...new Set(input.sessionIds)];
    // Lock selected sessions so concurrent registrations can't exceed caps.
    const sess = ids.length
      ? await tx.select({ id: s.sessions.id, title: s.sessions.title, capacity: s.sessions.capacity, fee: s.sessions.fee, early_fee: s.sessions.earlyFee, registrable: s.sessions.registrable, status: s.sessions.status })
          .from(s.sessions).where(inArray(s.sessions.id, ids)).for("update")
      : [];
    if (sess.length !== ids.length || sess.some((x) => !x.registrable || x.status !== "APPROVED")) throw new Error("One or more selected sessions are not open for registration.");
    for (const x of sess) {
      if (x.capacity == null) continue;
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.registrationItems)
        .innerJoin(s.registrations, eq(s.registrations.id, s.registrationItems.registrationId))
        .where(and(eq(s.registrationItems.sessionId, x.id), inArray(s.registrations.paymentStatus, ["PENDING", "PAID", "WAIVED"])));
      if (n >= x.capacity) throw new CapacityError(`"${x.title}" is full. Please deselect it to continue.`);
    }
    const conferenceFee = input.includePass === false ? 0 : early ? cat.earlyFee : cat.fee;
    const items = sess.map((x) => ({ sessionId: x.id, fee: early && x.early_fee != null ? x.early_fee : x.fee }));
    const subtotal = conferenceFee + items.reduce((a, b) => a + b.fee, 0);
    const totalFee = subtotal + processingFee(subtotal, ev.processingFeePct);

    const n = await nextNumber(`reg-${prefix}-${year}`, tx as any);
    const regNo = `${prefix}-${year}-${pad(n, 5)}`;
    const [reg] = await tx.insert(s.registrations).values({
      regNo, accountId: opts.accountId ?? null, accessToken: randomToken(), title: input.title, gender: input.gender, firstName: input.firstName, lastName: input.lastName,
      email: input.email, phone: input.phone, pmdcNo: input.pmdcNo || null, specialty: input.specialty || null, designation: input.designation || null,
      institution: input.institution, address: input.address || null, city: input.city || null, categoryId: cat.id,
      conferenceFee, totalFee, earlyBird: early, paymentStatus: totalFee === 0 ? "WAIVED" : "PENDING",
    }).returning();
    if (items.length) await tx.insert(s.registrationItems).values(items.map((i) => ({ ...i, registrationId: reg.id })));
    return reg;
  });

  await sendRegistrationNotice(result.id, "created").catch((e) => console.error("notify failed", e));
  return result;
}

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
  const rows = r.items.map((i) => `<li>${i.session.title}</li>`).join("");
  const html = emailLayout(
    confirmed ? "Your registration is confirmed" : "Registration received — payment pending",
    `<p>Dear ${r.title} ${r.firstName} ${r.lastName},</p>
     <p>Thank you for registering for the <b>${ev.name}</b> — <i>${ev.theme}</i>, ${fmtDate(ev.startDate, { day: "numeric", month: "long" })} – ${fmtDate(ev.endDate)} at ${ev.venue}.</p>
     <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
       <tr><td style="padding:6px 0;color:#5b6b8c">Registration No.</td><td style="font-weight:700;font-size:18px">${r.regNo}</td></tr>
       <tr><td style="padding:6px 0;color:#5b6b8c">Category</td><td>${r.category.label}</td></tr>
       <tr><td style="padding:6px 0;color:#5b6b8c">Total fee</td><td><b>${pkr(r.totalFee)}</b></td></tr>
       <tr><td style="padding:6px 0;color:#5b6b8c">Status</td><td><b style="color:${confirmed ? "#0b8a4c" : "#c47a00"}">${confirmed ? "CONFIRMED" : "PAYMENT PENDING"}</b></td></tr>
     </table>
     ${rows ? `<p style="margin-bottom:4px">Sessions / workshops:</p><ul style="margin-top:0">${rows}</ul>` : ""}
     <p>A PDF with all the details you submitted is attached. Please bring it (or the QR code) to the registration desk.</p>`,
    { label: confirmed ? "View registration" : "Complete payment", href: link }
  );
  await sendEmail(r.email, `${ev.name} — ${confirmed ? "Registration confirmed" : "Registration received"} (${r.regNo})`, html, [
    { filename: `${r.regNo}.pdf`, content: pdf, contentType: "application/pdf" },
  ]);
  const sms = confirmed
    ? `LNH Symposium: Dear ${r.firstName}, your registration ${r.regNo} is CONFIRMED. Fee ${pkr(r.totalFee)} received. See you on ${fmtDate(ev.startDate, { day: "numeric", month: "short" })}.`
    : `LNH Symposium: Dear ${r.firstName}, registration ${r.regNo} received. Please pay ${pkr(r.totalFee)} to confirm: ${link}`;
  await sendSms(r.phone, sms);
}
