import "server-only";
import { and, eq, inArray, isNull, isNotNull } from "drizzle-orm";
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
  const conds = [inArray(s.registrations.paymentStatus, ["PAID", "WAIVED"]), isNull(s.registrations.certificateNo)];
  if (opts.attendedOnly) conds.push(isNotNull(s.registrations.checkedInAt));
  const rows = await db.select().from(s.registrations).where(and(...conds));
  for (const r of rows) {
    const no = `LNH${yy}-C${pad(await nextNumber(`cert-${yy}`), 5)}`;
    await db.update(s.registrations).set({ certificateNo: no, certificateAt: new Date() }).where(eq(s.registrations.id, r.id));
    if (opts.notify) {
      const link = `${appUrl()}/api/certificates/${r.accessToken}`;
      await sendEmail(r.email, `${ev.name} — your e-certificate`, emailLayout("Your e-certificate is ready",
        `<p>Dear ${r.title} ${r.firstName} ${r.lastName},</p><p>Thank you for participating in the <b>${ev.name}</b>. Your certificate of participation (No. <b>${no}</b>) is ready to download.</p>`,
        { label: "Download certificate", href: link }));
      await sendSms(r.phone, `LNH Symposium: Your e-certificate ${no} is ready. Download: ${link}`);
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
