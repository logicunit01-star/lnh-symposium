import { asc, desc, isNotNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageTitle, StatusBadge } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/utils";
import { broadcast, issueCerts } from "../actions";
import { BatchProgress } from "@/components/admin/BatchProgress";
import { mailState } from "@/lib/mail-config";
import { notifyConfig } from "@/lib/notify-config";
import { beforeEventEnd, getEvent } from "@/lib/event";

export default async function Comms({ searchParams }: { searchParams: { sent?: string; issued?: string; batch?: string; err?: string } }) {
  const u = await requirePerm("notifications");
  const [sessions, logs, [{ issued }]] = await Promise.all([
    db.select({ id: s.sessions.id, title: s.sessions.title }).from(s.sessions).where(sql`${s.sessions.registrable}`).orderBy(asc(s.sessions.day), asc(s.sessions.startsAt)),
    db.select().from(s.notificationLog).orderBy(desc(s.notificationLog.createdAt)).limit(30),
    db.select({ issued: sql<number>`count(*)::int` }).from(s.registrations).where(isNotNull(s.registrations.certificateNo)),
  ]);
  // audit 16 Nov 2026: the mailbox lives in Admin → Email settings (SMTP_* in the server file is only a fallback)
  const mail = await mailState().catch(() => null);
  const smtp = !!process.env.SMTP_HOST || !!mail?.accounts.some((a) => a.active), sms = !!process.env.SMS_API_URL || (await notifyConfig()).smsEnabled;
  const counts = await db.select({ st: s.registrations.paymentStatus, n: sql<number>`count(*)::int` }).from(s.registrations).groupBy(s.registrations.paymentStatus);
  const n = (k: string[]) => counts.filter((c) => k.includes(c.st)).reduce((a, c) => a + c.n, 0);
  const ev = await getEvent();
  const early = beforeEventEnd(ev);
  const eligible = (await db.select({ n: sql<number>`count(*)::int` }).from(s.registrations).where(sql`${s.registrations.paymentStatus} in ('PAID','WAIVED') and ${s.registrations.hasPass} and ${s.registrations.certificateNo} is null and (${s.registrations.regType} = 'PARTICIPANT' or ${s.registrations.approvalStatus} = 'APPROVED')`))[0].n;
  return (
    <>
      <PageTitle title="Reminders & certificates" sub="Send news and reminders to participants, and issue e-certificates." />
      {searchParams.batch ? <BatchProgress batch={searchParams.batch} /> : searchParams.sent && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Message queued to {searchParams.sent} participant(s).</p>}
      {searchParams.err && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{searchParams.err === "confirm" ? "Tick the confirmation to send the message." : searchParams.err === "early" ? "The symposium has not ended yet. Tick the confirmation to issue certificates early." : "Not done."}</p>}
      {searchParams.issued && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{searchParams.issued} certificate(s) issued.</p>}
      {(!smtp || !sms) && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{!smtp && "SMTP is not configured — emails are logged only. "}{!sms && "SMS gateway is not configured — SMS are logged only. "}Set the mailbox in Email settings and SMS in WhatsApp &amp; SMS (or the server .env) file.</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <form action={broadcast} className="a-card space-y-3 p-6">
          <h2 className="font-display text-lg font-bold">Send reminder / news</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="a-label">Audience</label><select name="audience" className="a-input"><option value="PAID">Confirmed participants</option><option value="PENDING">Payment pending</option><option value="ALL">All registrants</option><option value="SESSION">Participants of a session…</option></select></div>
            <div><label className="a-label">Session (if selected)</label><select name="sessionId" className="a-input"><option value="">—</option>{sessions.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select></div>
          </div>
          <div><label className="a-label">Email subject</label><input name="subject" required className="a-input" defaultValue="Reminder: LNH Symposium starts soon" /></div>
          <div><label className="a-label">Email message</label><textarea name="body" rows={6} required className="a-input" defaultValue={"We look forward to welcoming you to the symposium.\n\nPlease arrive by 8:30 AM for registration and bring your confirmation PDF or QR code."} /></div>
          <div><label className="a-label">SMS text (use {"{name}"} and {"{regNo}"})</label><input name="sms" maxLength={300} className="a-input" defaultValue="LNH Symposium: Dear {name}, reminder that the symposium starts soon. Bring reg no. {regNo}." /></div>
          <div className="flex gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="channel" value="EMAIL" defaultChecked /> Email</label><label className="flex items-center gap-2"><input type="checkbox" name="channel" value="SMS" defaultChecked /> SMS</label></div>
          <p className="text-xs text-slate-500">Recipients: confirmed {n(["PAID", "WAIVED"])} · payment pending {n(["PENDING"])} · all {n(["PAID", "WAIVED", "PENDING"])}</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" required />I have checked the audience and the text; send it now</label>
          <button className="a-btn-red">Send now</button>
          <p className="text-xs text-slate-400">Automatic reminders: schedule <code>GET /api/cron/reminders</code> (e.g. daily) — see README.</p>
        </form>
        {can(u, "certificates") && (
          <form action={issueCerts} className="a-card space-y-3 p-6">
            <h2 className="font-display text-lg font-bold">E-certificates</h2>
            <p className="text-sm text-slate-600">{issued} certificate(s) issued so far. Issuing assigns a unique, verifiable certificate number to each eligible participant (paid or waived) who doesn’t have one yet.</p>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="attendedOnly" /> Only participants who were checked in</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked /> Email + SMS the download link</label>
            <p className="text-xs text-slate-500">{eligible} eligible now: symposium registrations (paid or waived), and approved guests and volunteers. Workshop-only registrations get their workshop certificates separately.</p>
            {early && <label className="flex items-center gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900"><input type="checkbox" name="early" />The symposium ends {fmtDateTime(ev.endDate)}. Issue certificates before that anyway</label>}
            <button className="a-btn-primary">Issue certificates</button>
          </form>
        )}
      </div>
      <div className="a-card mt-6 overflow-x-auto">
        <p className="px-5 py-4 text-sm font-semibold text-slate-700">Notification log (latest 30)</p>
        <table className="a-table"><thead><tr><th>Channel</th><th>To</th><th>Subject / text</th><th>Status</th><th>When</th></tr></thead>
          <tbody>{logs.map((l) => <tr key={l.id}><td className="text-xs">{l.channel}</td><td className="text-xs">{l.to}</td><td className="max-w-md truncate text-xs">{l.subject ?? l.body}</td><td><StatusBadge s={l.status} />{l.error && <p className="text-[10px] text-rose-600">{l.error}</p>}</td><td className="whitespace-nowrap text-xs">{fmtDateTime(l.createdAt)}</td></tr>)}</tbody></table>
      </div>
    </>
  );
}
