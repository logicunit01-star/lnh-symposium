import "server-only";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema as s } from "./db";
import { getEvent } from "./event";
import { sendEmail, sendSms, emailLayout } from "./notify";
import { appUrl, fmtDate, pkr } from "./utils";

/** Idempotent reminder job — safe to run hourly/daily. */
export async function runReminders(now = new Date()) {
  const ev = await getEvent();
  let pending = 0, event = 0;
  // 1) payment pending > 48h, at most one reminder every 72h
  const due = await db.select().from(s.registrations).where(and(
    eq(s.registrations.paymentStatus, "PENDING"),
    lt(s.registrations.createdAt, new Date(+now - 48 * 3600e3)),
    or(isNull(s.registrations.remindedAt), lt(s.registrations.remindedAt, new Date(+now - 72 * 3600e3))),
  ));
  for (const r of due) {
    const link = `${appUrl()}/register/success/${r.accessToken}`;
    await sendEmail(r.email, `Payment pending — ${r.regNo}`, emailLayout("Complete your registration",
      `<p>Dear ${r.title} ${r.firstName} ${r.lastName},</p><p>Your registration <b>${r.regNo}</b> for the ${ev.name} is awaiting payment of <b>${pkr(r.totalFee)}</b>. Seats in workshops and sessions are limited and are confirmed on payment.</p>`, { label: "Pay now", href: link }));
    await sendSms(r.phone, `LNH Symposium: Reg ${r.regNo} payment of ${pkr(r.totalFee)} pending. Pay: ${link}`);
    await db.update(s.registrations).set({ remindedAt: now }).where(eq(s.registrations.id, r.id));
    pending++;
  }
  // 2) event reminder, once, within 48h of the start
  const hrs = (+ev.startDate - +now) / 3600e3;
  if (hrs > 0 && hrs <= 48) {
    const [flag] = await db.select().from(s.counters).where(eq(s.counters.key, `event-reminder-${ev.startDate.toISOString()}`));
    if (!flag) {
      await db.insert(s.counters).values({ key: `event-reminder-${ev.startDate.toISOString()}`, value: 1 });
      const list = await db.select().from(s.registrations).where(inArray(s.registrations.paymentStatus, ["PAID", "WAIVED"]));
      for (const r of list) {
        await sendEmail(r.email, `See you soon — ${ev.name}`, emailLayout("The symposium is almost here",
          `<p>Dear ${r.title} ${r.firstName},</p><p>The <b>${ev.name}</b> begins on <b>${fmtDate(ev.startDate, { weekday: "long", day: "numeric", month: "long" })}</b> at ${ev.venue}. Registration opens at 8:30 AM.</p><p>Please bring your confirmation (registration no. <b>${r.regNo}</b>) or show the QR code from your email.</p>`,
          { label: "View my registration", href: `${appUrl()}/register/success/${r.accessToken}` }));
        await sendSms(r.phone, `LNH Symposium starts ${fmtDate(ev.startDate, { day: "numeric", month: "short" })}, 8:30 AM. Bring reg no. ${r.regNo}. See you there!`);
        event++;
      }
    }
  }
  return { pending, event };
}
