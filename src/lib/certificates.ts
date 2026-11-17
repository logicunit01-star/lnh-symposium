import "server-only";
import { sendTemplate } from "./email";
import { and, eq, inArray, isNull, isNotNull, or } from "drizzle-orm";
import { db, schema as s } from "./db";
import { nextNumber, pad } from "./counters";
import { getEvent, editionYear } from "./event";
import { certificatePdf } from "./pdf";
import { sendEmail, emailLayout, sendSms } from "./notify";
import { appUrl, fmtDate } from "./utils";

/** Issues certificate numbers to eligible registrations and emails the download link. */
export async function issueCertificates(opts: { attendedOnly: boolean; notify: boolean }) {
  const ev = await getEvent();
  const yy = String(editionYear(ev)).slice(-2);
  // audit 16 Nov 2026: symposium certificates only for symposium registrations (not workshop-only) and approved guests / volunteers
  const conds = [inArray(s.registrations.paymentStatus, ["PAID", "WAIVED"]), isNull(s.registrations.certificateNo), eq(s.registrations.hasPass, true),
    or(eq(s.registrations.regType, "PARTICIPANT"), eq(s.registrations.approvalStatus, "APPROVED"))!];
  if (opts.attendedOnly) conds.push(isNotNull(s.registrations.checkedInAt));
  const rows = await db.select().from(s.registrations).where(and(...conds));
  for (const r of rows) {
    const no = `LNH${yy}-C${pad(await nextNumber(`cert-${yy}`), 5)}`;
    await db.update(s.registrations).set({ certificateNo: no, certificateAt: new Date() }).where(eq(s.registrations.id, r.id));
    if (opts.notify) {
      const link = `${appUrl()}/api/certificates/${r.accessToken}`;
      await sendTemplate("CERTIFICATE_READY", r.email, { name: `${r.title} ${r.firstName} ${r.lastName}`, certificate_no: no, link }, { ref: r.regNo });
      await sendSms(r.phone, `LNH Symposium: Your e-certificate ${no} is ready. Download: ${link}`, "CERTIFICATE_READY", r.regNo, { participant_name: `${r.title} ${r.firstName} ${r.lastName}` });
    }
  }
  return rows.length;
}

export async function certificateFor(token: string) {
  const r = await db.query.registrations.findFirst({ where: eq(s.registrations.accessToken, token), with: { items: { with: { session: true } } } });
  if (!r?.certificateNo) return null;
  const ev = await getEvent();
  const attended = r.items.filter((i) => i.session.type === "WORKSHOP" && (i.attendedAt || !r.checkedInAt));
  const cme = attended.reduce((a, i) => a + (i.session.cmeHours ?? 0), 0);
  const pdf = await certificatePdf({
    name: `${r.title} ${r.firstName} ${r.lastName}`, certificateNo: r.certificateNo, eventName: ev.name, theme: ev.theme,
    dates: `${fmtDate(ev.startDate, { day: "numeric", month: "long" })} - ${fmtDate(ev.endDate)}`,
    items: attended.map((i) => `Workshop: ${i.session.title}`), cme: cme || undefined,
  });
  return { pdf, no: r.certificateNo };
}

/* ---------- Workshop e-certificates (N6, LNH answers 13 Nov 2026) ----------
 * Issued automatically once (1) the department focal person has verified the participant's attendance and
 * (2) the participant has submitted the workshop feedback form. One certificate per workshop ticket. */
export const workshopCertUrl = (itemId: string, token: string) => `${appUrl()}/api/certificates/workshop/${itemId}?t=${encodeURIComponent(token)}`;

export async function maybeIssueWorkshopCert(itemId: string, opts: { notify?: boolean } = {}) {
  const it = await db.query.registrationItems.findFirst({ where: eq(s.registrationItems.id, itemId), with: { session: true, registration: true } });
  if (!it || it.session.type !== "WORKSHOP" || it.certNo || !it.verifiedAt) return null;
  const r = it.registration;
  if (r.paymentStatus !== "PAID" && r.paymentStatus !== "WAIVED") return null;
  const [fb] = await db.select({ id: s.feedback.id }).from(s.feedback).where(and(eq(s.feedback.sessionId, it.sessionId), eq(s.feedback.registrationId, r.id))).limit(1);
  if (!fb) return null;
  const ev = await getEvent();
  const yy = String(editionYear(ev)).slice(-2);
  const no = `LNH${yy}-W${pad(await nextNumber(`wcert-${yy}`), 5)}`;
  const [done] = await db.update(s.registrationItems).set({ certNo: no, certAt: new Date() }).where(and(eq(s.registrationItems.id, it.id), isNull(s.registrationItems.certNo))).returning({ id: s.registrationItems.id });
  if (!done) return null; // issued by a parallel request
  if (opts.notify !== false) {
    const link = workshopCertUrl(it.id, r.accessToken);
    await sendTemplate("WORKSHOP_CERTIFICATE", r.email, { name: `${r.title} ${r.firstName} ${r.lastName}`, workshop: it.session.title, certificate_no: no, link }, { ref: it.ticketNo ?? r.regNo }).catch((e) => console.error(e));
    await sendSms(r.phone, `LNH Symposium: your certificate for "${it.session.title.slice(0, 60)}" is ready. ${link}`, "CERTIFICATE_READY", it.ticketNo ?? r.regNo, { participant_name: `${r.title} ${r.firstName} ${r.lastName}` }).catch(() => {});
  }
  return no;
}

export async function workshopCertificateFor(itemId: string, token: string) {
  const it = await db.query.registrationItems.findFirst({ where: eq(s.registrationItems.id, itemId), with: { session: true, registration: true } });
  if (!it?.certNo || it.registration.accessToken !== token) return null;
  const ev = await getEvent(), r = it.registration, w = it.session;
  const dates = w.days > 1 ? `${fmtDate(w.startsAt, { day: "numeric", month: "long" })} - ${fmtDate(w.endsAt)}` : fmtDate(w.startsAt);
  const pdf = await certificatePdf({
    name: `${r.title} ${r.firstName} ${r.lastName}`, certificateNo: it.certNo, eventName: ev.name, theme: ev.theme, dates,
    items: [`Workshop: ${w.title}`], cme: w.cmeHours ?? undefined,
  });
  return { pdf, no: it.certNo };
}

/** After the focal person confirms attendance and no feedback is in yet: ask for feedback (the certificate follows it). */
export async function requestWorkshopFeedback(itemId: string) {
  const it = await db.query.registrationItems.findFirst({ where: eq(s.registrationItems.id, itemId), with: { session: true, registration: true } });
  if (!it || it.certNo || !it.verifiedAt) return false;
  const r = it.registration;
  const link = `${appUrl()}/feedback/${it.session.slug}?t=${encodeURIComponent(r.accessToken)}`;
  await sendTemplate("WORKSHOP_FEEDBACK_REQUEST", r.email, { name: `${r.title} ${r.firstName} ${r.lastName}`, workshop: it.session.title, link }, { ref: it.ticketNo ?? r.regNo }).catch((e) => console.error(e));
  return true;
}
