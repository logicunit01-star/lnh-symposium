import "server-only";
import { and, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db, schema as s } from "./db";
import { getEvent } from "./event";
import { sendEmail, sendSms, emailLayout } from "./notify";
import { appUrl, fmtDate, fmtTime24, pkr } from "./utils";
import { sendTemplate } from "./email";

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
      `<p>Dear ${r.title} ${r.firstName} ${r.lastName},</p><p>Your registration <b>${r.regNo}</b> for the ${ev.name} is awaiting payment of <b>${pkr(r.totalFee)}</b>. Workshop seats are limited and are confirmed on payment.</p>`, { label: "Pay now", href: link }));
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
      const list = await db.select().from(s.registrations).where(and(inArray(s.registrations.paymentStatus, ["PAID", "WAIVED"]), eq(s.registrations.hasPass, true)));
      for (const r of list) {
        await sendEmail(r.email, `See you soon — ${ev.name}`, emailLayout("The symposium is almost here",
          `<p>Dear ${r.title} ${r.firstName},</p><p>The <b>${ev.name}</b> begins on <b>${fmtDate(ev.startDate, { weekday: "long", day: "numeric", month: "long" })}</b> at ${ev.venue}. Registration opens at 8:30 AM.</p><p>Please bring your confirmation (registration no. <b>${r.regNo}</b>) or show the QR code from your email.</p>`,
          { label: "View my registration", href: `${appUrl()}/register/success/${r.accessToken}` }));
        await sendSms(r.phone, `LNH Symposium starts ${fmtDate(ev.startDate, { day: "numeric", month: "short" })}, 8:30 AM. Bring reg no. ${r.regNo}. See you there!`);
        event++;
      }
    }
  }
  // 3) workshop reminder: once per confirmed workshop ticket, about a day before it starts (release 3)
  let workshop = 0;
  const soon = await db.select({ item: s.registrationItems, reg: s.registrations, ses: s.sessions }).from(s.registrationItems)
    .innerJoin(s.registrations, eq(s.registrations.id, s.registrationItems.registrationId)).innerJoin(s.sessions, eq(s.sessions.id, s.registrationItems.sessionId))
    .where(and(isNull(s.registrationItems.remindedAt), inArray(s.registrations.paymentStatus, ["PAID", "WAIVED"]),
      sql`${s.sessions.startsAt} > ${now}`, sql`${s.sessions.startsAt} <= ${new Date(+now + 36 * 3600e3)}`));
  for (const { item, reg: r, ses } of soon) {
    await sendTemplate("WORKSHOP_REMINDER", r.email, {
      name: `${r.title} ${r.firstName} ${r.lastName}`, session_name: ses.title, session_date: fmtDate(ses.startsAt, { weekday: "long", day: "numeric", month: "long" }),
      session_time: `${fmtTime24(ses.startsAt)}–${fmtTime24(ses.endsAt)}`, venue: ses.hall, ticket_no: item.ticketNo ?? r.regNo, link: `${appUrl()}/register/success/${r.accessToken}`,
    }, { ref: item.ticketNo ?? r.regNo, noCc: true }).catch((e) => console.error("workshop reminder failed", e));
    await sendSms(r.phone, `LNH Symposium: reminder, workshop "${ses.title.slice(0, 60)}" on ${fmtDate(ses.startsAt, { day: "numeric", month: "short" })} at ${fmtTime24(ses.startsAt)}, ${ses.hall ?? ""}. Show ticket ${item.ticketNo ?? r.regNo} QR at the door.`);
    await db.update(s.registrationItems).set({ remindedAt: now }).where(eq(s.registrationItems.id, item.id));
    workshop++;
  }
  return { pending, event, workshop };
}
