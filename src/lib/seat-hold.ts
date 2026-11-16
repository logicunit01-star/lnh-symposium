import "server-only";
import { and, asc, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { db, schema as s } from "./db";
import { getEvent } from "./event";
import { appUrl, fmtDateTime, pkr } from "./utils";

/**
 * P1 (Go-live check, 16 Nov 2026): an unpaid registration holding workshop seats is cancelled when the seat hold
 * (Admin → Event settings, default 72 hours) ends, and the seats go back on sale. Registrations without workshops
 * (symposium only, no seat limit) stay pending (question C2). A PayPro order is checked with PayPro first, so a
 * payment made at a bank just before the deadline is never cancelled.
 */
const LIVE = ["PENDING", "PAID", "WAIVED"] as const;

export const holdEnd = (createdAt: Date, hours: number) => (hours > 0 ? new Date(+createdAt + hours * 3600e3) : null);

/** When this registration's unpaid workshop seats are released (null: no workshops, already paid, or no hold). */
export async function payBy(regId: string) {
  const ev = await getEvent();
  if (!ev.seatHoldHours) return null;
  const [r] = await db.select({ st: s.registrations.paymentStatus, at: s.registrations.createdAt }).from(s.registrations).where(eq(s.registrations.id, regId));
  if (!r || r.st !== "PENDING") return null;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.registrationItems).where(eq(s.registrationItems.registrationId, regId));
  return n ? holdEnd(new Date(Math.max(+r.at, +ev.seatHoldSince)), ev.seatHoldHours) : null;
}
/** The sentence for {{pay_by_note}} in the emails, or "" (the paragraph is then left out). */
export async function payByNote(regId: string) {
  const d = await payBy(regId);
  return d ? `Please pay by ${fmtDateTime(d)} (Pakistan time). After that, unpaid workshop seats are released to other participants and this registration is cancelled.` : "";
}

/** Are seats still free for every workshop on this registration (not counting the registration itself)? */
export async function seatsFree(regId: string) {
  const items = await db.select({ sid: s.registrationItems.sessionId, cap: s.sessions.capacity }).from(s.registrationItems)
    .innerJoin(s.sessions, eq(s.sessions.id, s.registrationItems.sessionId)).where(eq(s.registrationItems.registrationId, regId));
  for (const i of items) {
    if (i.cap == null) continue;
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.registrationItems)
      .innerJoin(s.registrations, eq(s.registrations.id, s.registrationItems.registrationId))
      .where(and(eq(s.registrationItems.sessionId, i.sid), inArray(s.registrations.paymentStatus, [...LIVE]), ne(s.registrations.id, regId)));
    if (n >= i.cap) return false;
  }
  return true;
}

/** Emails the next people on a workshop's waitlist when seats are free. */
export async function notifyWaitlistFor(sessionId: string) {
  const [w] = await db.select().from(s.sessions).where(eq(s.sessions.id, sessionId));
  if (!w?.capacity) return 0;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.registrationItems)
    .innerJoin(s.registrations, eq(s.registrations.id, s.registrationItems.registrationId))
    .where(and(eq(s.registrationItems.sessionId, sessionId), inArray(s.registrations.paymentStatus, [...LIVE])));
  const free = Math.max(0, w.capacity - n);
  if (!free) return 0;
  const { sendTemplate } = await import("./email");
  const { fmtDate } = await import("./utils");
  const next = await db.select().from(s.waitlist).where(and(eq(s.waitlist.sessionId, sessionId), isNull(s.waitlist.notifiedAt))).orderBy(asc(s.waitlist.createdAt)).limit(free);
  for (const p of next) {
    await sendTemplate("WAITLIST_SEAT_FREE", p.email, { name: p.name, workshop: w.title, workshop_date: fmtDate(w.startsAt), link: `${appUrl()}/workshops/${w.slug}` }, { ref: w.title });
    await db.update(s.waitlist).set({ notifiedAt: new Date() }).where(eq(s.waitlist.id, p.id));
  }
  return next.length;
}

/** Scheduled job (every 15 minutes on the LNH server, daily on Vercel): cancels unpaid registrations whose seat hold ended. */
export async function expireUnpaid(now = new Date()) {
  const ev = await getEvent();
  if (!ev.seatHoldHours) return { expired: 0, paidJustInTime: 0 };
  const cutoff = new Date(+now - ev.seatHoldHours * 3600e3);
  if (+ev.seatHoldSince > +cutoff) return { expired: 0, paidJustInTime: 0 }; // first hold after this release has not ended yet
  const due = await db.select().from(s.registrations).where(and(eq(s.registrations.paymentStatus, "PENDING"), lt(s.registrations.createdAt, cutoff),
    sql`exists (select 1 from registration_items i where i.registration_id = ${s.registrations.id})`)).limit(200);
  const { checkPayPro } = await import("./payments");
  const { sendTemplate } = await import("./email");
  let expired = 0, paidJustInTime = 0;
  for (const r of due) {
    // a PayPro order may have been paid without a callback yet: ask PayPro first
    const open = await db.select({ txn: s.payments.txnRef }).from(s.payments).where(and(eq(s.payments.registrationId, r.id), eq(s.payments.provider, "paypro"), eq(s.payments.status, "PENDING")));
    let paid = false, unsure = false;
    for (const p of open) { try { if ((await checkPayPro(p.txn))?.paid) paid = true; } catch { unsure = true; } }
    if (paid) { paidJustInTime++; continue; }
    if (unsure) continue; // PayPro did not answer: try again on the next run rather than cancel a possibly paid order
    const [done] = await db.update(s.registrations).set({ paymentStatus: "FAILED", notes: sql`concat_ws(E'\n', ${s.registrations.notes}, ${`Cancelled automatically ${fmtDateTime(now)}: not paid within ${ev.seatHoldHours} hours (seat hold).`}::text)` })
      .where(and(eq(s.registrations.id, r.id), eq(s.registrations.paymentStatus, "PENDING"))).returning({ id: s.registrations.id });
    if (!done) continue;
    await db.update(s.payments).set({ status: "FAILED" }).where(and(eq(s.payments.registrationId, r.id), eq(s.payments.status, "PENDING")));
    const items = await db.select({ sid: s.registrationItems.sessionId, title: s.sessions.title }).from(s.registrationItems)
      .innerJoin(s.sessions, eq(s.sessions.id, s.registrationItems.sessionId)).where(eq(s.registrationItems.registrationId, r.id));
    await sendTemplate("SEAT_HOLD_EXPIRED", r.email, {
      name: `${r.title} ${r.firstName} ${r.lastName}`, reg_no: r.regNo, amount: pkr(r.totalFee), hold_hours: String(ev.seatHoldHours),
      workshop: items.map((i) => i.title).join("; "), link: `${appUrl()}/workshops`,
    }, { ref: r.regNo }).catch((e) => console.error("seat hold email", r.regNo, e));
    for (const i of items) await notifyWaitlistFor(i.sid).catch(() => {});
    expired++;
  }
  return { expired, paidJustInTime };
}
