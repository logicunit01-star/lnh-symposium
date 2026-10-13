import { asc, desc, isNotNull, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageTitle, StatusBadge } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/utils";
import { broadcast, issueCerts } from "../actions";

export default async function Comms({ searchParams }: { searchParams: { sent?: string; issued?: string } }) {
  const u = await requirePerm("notifications");
  const [sessions, logs, [{ issued }]] = await Promise.all([
    db.select({ id: s.sessions.id, title: s.sessions.title }).from(s.sessions).where(sql`${s.sessions.registrable}`).orderBy(asc(s.sessions.day), asc(s.sessions.startsAt)),
    db.select().from(s.notificationLog).orderBy(desc(s.notificationLog.createdAt)).limit(30),
    db.select({ issued: sql<number>`count(*)::int` }).from(s.registrations).where(isNotNull(s.registrations.certificateNo)),
  ]);
  const smtp = !!process.env.SMTP_HOST, sms = !!process.env.SMS_API_URL;
  return (
    <>
      <PageTitle title="Reminders & certificates" sub="Send news and reminders to participants, and issue e-certificates." />
      {searchParams.sent && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Message queued to {searchParams.sent} participant(s).</p>}
      {searchParams.issued && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{searchParams.issued} certificate(s) issued.</p>}
      {(!smtp || !sms) && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{!smtp && "SMTP is not configured — emails are logged only. "}{!sms && "SMS gateway is not configured — SMS are logged only. "}Set them in the server .env file.</p>}
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
          <button className="a-btn-red">Send now</button>
          <p className="text-xs text-slate-400">Automatic reminders: schedule <code>GET /api/cron/reminders</code> (e.g. daily) — see README.</p>
        </form>
        {can(u.role, "certificates") && (
          <form action={issueCerts} className="a-card space-y-3 p-6">
            <h2 className="font-display text-lg font-bold">E-certificates</h2>
            <p className="text-sm text-slate-600">{issued} certificate(s) issued so far. Issuing assigns a unique, verifiable certificate number to each eligible participant (paid or waived) who doesn’t have one yet.</p>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="attendedOnly" /> Only participants who were checked in</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" defaultChecked /> Email + SMS the download link</label>
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
