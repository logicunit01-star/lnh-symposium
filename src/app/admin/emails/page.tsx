import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { getEvent } from "@/lib/event";
import { PageTitle, Pager } from "@/components/admin/ui";
import { allTemplates, ensureDefaultJobs, renderTemplate, runDueJobs, JOB_KINDS } from "@/lib/email";
import { DEFAULT_TEMPLATES, MERGE_FIELDS, SAMPLE_VARS } from "@/lib/email-templates";
import { cn, fmtDateTime, TZ } from "@/lib/utils";
import { cancelJob, rescheduleJob, runJobNow, saveTemplate, scheduleJob } from "./actions";

export const metadata = { title: "Automated emails" };
export const dynamic = "force-dynamic";

const local = (d: Date) => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour").replace("24", "00")}:${g("minute")}`;
};
const TONE: Record<string, string> = { SCHEDULED: "bg-amber-100 text-amber-800", RUNNING: "bg-sky-100 text-sky-800", DONE: "bg-emerald-100 text-emerald-800", CANCELLED: "bg-slate-200 text-slate-600", FAILED: "bg-rose-100 text-rose-700", SENT: "bg-emerald-100 text-emerald-800", LOGGED: "bg-slate-100 text-slate-600" };
const PER = 40;

/** SC feedback (29 Oct 2026): automated email management — templates with merge fields, dispatch schedule, sent log. */
export default async function Emails({ searchParams }: { searchParams: { tab?: string; t?: string; saved?: string; err?: string; ran?: string; q?: string; tpl?: string; st?: string; page?: string } }) {
  await requirePerm("emails");
  await ensureDefaultJobs();
  const autoRan = await runDueJobs("Opened by admin");
  const ev = await getEvent();
  const tab = searchParams.tab ?? "templates";
  const Tabs = (
    <div className="mb-5 flex flex-wrap gap-2">
      {[["templates", "Templates"], ["schedule", "Dispatch schedule"], ["log", "Sent emails"]].map(([k, l]) => (
        <Link key={k} href={`/admin/emails?tab=${k}`} className={cn("a-btn-ghost py-1.5 text-sm", tab === k && "border-lnh-blue text-lnh-blue")}>{l}</Link>
      ))}
    </div>
  );
  const head = (
    <>
      <PageTitle title="Automated emails" sub={`Sent from ${ev.emailFrom || process.env.MAIL_FROM || "the default address"}${ev.emailCc ? `, CC ${ev.emailCc}` : ""}. Change the sender and CC in Event Settings. ${process.env.SMTP_HOST ? "" : "SMTP is not configured yet, so messages are recorded in the log but not delivered."}`} />
      {autoRan.length > 0 && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Due dispatches ran now: {autoRan.join("; ")}</p>}
      {Tabs}
    </>
  );

  if (tab === "schedule") {
    const jobs = await db.select().from(s.emailJobs).orderBy(desc(s.emailJobs.runAt));
    return (
      <>
        {head}
        {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Schedule saved.</p>}
        {searchParams.ran && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Dispatch run: {searchParams.ran}</p>}
        {searchParams.err && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Choose what to send and a date and time.</p>}
        <form action={scheduleJob} className="a-card mb-6 grid gap-3 p-5 sm:grid-cols-[1fr_220px_1fr_auto] sm:items-end">
          <div><label className="a-label">What to send</label><select name="kind" className="a-input">{Object.entries(JOB_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label className="a-label">When (Pakistan time)</label><input type="datetime-local" name="runAt" required className="a-input" /></div>
          <div><label className="a-label">Note (optional)</label><input name="note" className="a-input" placeholder="e.g. after agenda finalisation" /></div>
          <button className="a-btn-primary">Schedule</button>
        </form>
        <div className="a-card overflow-x-auto">
          <table className="a-table">
            <thead><tr><th>Dispatch</th><th>Scheduled for</th><th>Status</th><th>Result</th><th /></tr></thead>
            <tbody>{jobs.map((j) => (
              <tr key={j.id}>
                <td><b>{JOB_KINDS[j.kind]?.label ?? j.kind}</b><span className="block max-w-sm text-xs text-slate-500">{JOB_KINDS[j.kind]?.detail}{j.note ? ` · ${j.note}` : ""}</span><span className="text-[11px] text-slate-400">by {j.createdBy}</span></td>
                <td className="whitespace-nowrap text-sm">{j.status === "SCHEDULED" ? (
                  <form action={rescheduleJob.bind(null, j.id)} className="flex items-center gap-1"><input type="datetime-local" name="runAt" defaultValue={local(j.runAt)} className="a-input py-1 text-xs" aria-label="New date and time" /><button className="text-xs font-semibold text-lnh-blue hover:underline">Save</button></form>
                ) : fmtDateTime(j.runAt)}</td>
                <td><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[j.status])}>{j.status}</span></td>
                <td className="max-w-xs text-xs text-slate-600">{j.result ?? "—"}{j.ranAt && <span className="block text-slate-400">{fmtDateTime(j.ranAt)}</span>}</td>
                <td className="whitespace-nowrap text-right text-xs">{j.status === "SCHEDULED" && <>
                  <form action={runJobNow.bind(null, j.id)} className="inline"><button className="font-semibold text-lnh-blue hover:underline">Send now</button></form>
                  <form action={cancelJob.bind(null, j.id)} className="ml-3 inline"><button className="text-slate-500 hover:underline">Cancel</button></form></>}</td>
              </tr>
            ))}</tbody>
          </table>
          {!jobs.length && <p className="p-8 text-center text-sm text-slate-400">Nothing scheduled.</p>}
        </div>
        <p className="mt-3 text-xs text-slate-500">Dispatches run automatically when their time comes (scheduler at /api/cron/emails, and whenever this page is opened). Each email is recorded under Sent emails with date and time.</p>
      </>
    );
  }

  if (tab === "log") {
    const page = Math.max(1, Number(searchParams.page) || 1);
    const c: SQL[] = [eq(s.notificationLog.channel, "EMAIL")];
    if (searchParams.q) { const q = `%${searchParams.q}%`; c.push(or(ilike(s.notificationLog.to, q), ilike(s.notificationLog.subject, q), ilike(s.notificationLog.ref, q))!); }
    if (searchParams.tpl) c.push(eq(s.notificationLog.templateKey, searchParams.tpl));
    if (searchParams.st) c.push(eq(s.notificationLog.status, searchParams.st));
    const where = and(...c);
    const [rows, [{ n }]] = await Promise.all([
      db.select({ id: s.notificationLog.id, to: s.notificationLog.to, cc: s.notificationLog.cc, sender: s.notificationLog.sender, templateKey: s.notificationLog.templateKey, ref: s.notificationLog.ref, subject: s.notificationLog.subject, status: s.notificationLog.status, error: s.notificationLog.error, createdAt: s.notificationLog.createdAt })
        .from(s.notificationLog).where(where).orderBy(desc(s.notificationLog.createdAt)).limit(PER).offset((page - 1) * PER),
      db.select({ n: sql<number>`count(*)::int` }).from(s.notificationLog).where(where),
    ]);
    const qs = new URLSearchParams(Object.entries({ tab: "log", q: searchParams.q, tpl: searchParams.tpl, st: searchParams.st }).filter(([, v]) => v) as any).toString();
    return (
      <>
        {head}
        <form className="a-card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto]">
          <input type="hidden" name="tab" value="log" />
          <input name="q" defaultValue={searchParams.q} placeholder="Search recipient, subject, abstract ID…" className="a-input" />
          <select name="tpl" defaultValue={searchParams.tpl ?? ""} className="a-input"><option value="">All emails</option>{Object.entries(DEFAULT_TEMPLATES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>
          <select name="st" defaultValue={searchParams.st ?? ""} className="a-input"><option value="">Any status</option><option value="SENT">Sent</option><option value="LOGGED">Logged (SMTP off)</option><option value="FAILED">Failed</option></select>
          <button className="a-btn-primary">Filter</button>
        </form>
        <div className="a-card overflow-x-auto">
          <table className="a-table">
            <thead><tr><th>Date and time</th><th>To</th><th>Email</th><th>Status</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-xs">{fmtDateTime(r.createdAt)}</td>
                <td className="text-sm">{r.to}{r.cc && <span className="block text-[11px] text-slate-400">CC {r.cc}</span>}</td>
                <td className="max-w-md text-sm">{r.subject}<span className="block text-[11px] text-slate-400">{r.templateKey ? DEFAULT_TEMPLATES[r.templateKey as keyof typeof DEFAULT_TEMPLATES]?.name ?? r.templateKey : "System email"}{r.ref ? ` · ${r.ref}` : ""}{r.sender ? ` · from ${r.sender}` : ""}</span></td>
                <td><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[r.status] ?? "bg-slate-100")}>{r.status}</span>{r.error && <span className="block text-[11px] text-rose-600">{r.error}</span>}</td>
              </tr>
            ))}</tbody>
          </table>
          {!rows.length && <p className="p-8 text-center text-sm text-slate-400">No emails match.</p>}
          <Pager page={page} pages={Math.ceil(n / PER)} base={`/admin/emails?${qs}`} />
        </div>
      </>
    );
  }

  const templates = await allTemplates();
  const sel = templates.find((t) => t.key === searchParams.t) ?? templates[0];
  const def = DEFAULT_TEMPLATES[sel.key];
  const preview = renderTemplate(sel, { ...SAMPLE_VARS, event_name: ev.name });
  return (
    <>
      {head}
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Template saved.</p>}
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="a-card divide-y divide-slate-100 self-start">
          {templates.map((t) => (
            <Link key={t.key} href={`/admin/emails?t=${t.key}`} className={cn("block px-4 py-3 hover:bg-slate-50", sel.key === t.key && "bg-lnh-blue/5")}>
              <p className="text-sm font-semibold text-slate-800">{DEFAULT_TEMPLATES[t.key].name}</p>
              <p className="text-xs text-slate-500">{DEFAULT_TEMPLATES[t.key].audience}</p>
              {t.custom && <span className="badge mt-1 bg-sky-100 text-sky-800">Edited</span>}
            </Link>
          ))}
        </div>
        <div className="space-y-4">
          <form action={saveTemplate.bind(null, sel.key)} className="a-card space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-display text-lg font-bold">{def.name}</h2><p className="text-xs text-slate-500">To: {def.audience} · Sent: {def.when}</p></div>
              {sel.custom && <p className="text-xs text-slate-500">Edited by {sel.updatedBy}, {sel.updatedAt ? fmtDateTime(sel.updatedAt) : ""}</p>}</div>
            <div><label className="a-label">Subject</label><input name="subject" defaultValue={sel.subject} className="a-input" /></div>
            <div><label className="a-label">Message (blank line = new paragraph, **bold**, a line with an empty field is left out)</label><textarea name="body" rows={14} defaultValue={sel.body} className="a-input font-mono text-xs" /></div>
            <div><label className="a-label">Button label (links to the recipient's page)</label><input name="buttonLabel" defaultValue={sel.buttonLabel ?? ""} className="a-input" /></div>
            <div className="flex flex-wrap gap-2"><button className="a-btn-primary">Save template</button>{sel.custom && <button name="reset" value="1" className="a-btn-ghost">Restore default</button>}</div>
          </form>
          <div className="a-card p-5">
            <p className="text-sm font-semibold">Merge fields</p>
            <ul className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">{MERGE_FIELDS.map(([k, l]) => <li key={k}><code className="rounded bg-slate-100 px-1 font-mono">{`{{${k}}}`}</code> {l}</li>)}</ul>
          </div>
          <div className="a-card overflow-hidden">
            <p className="border-b border-slate-100 px-5 py-3 text-sm"><b>Preview</b> with sample values · Subject: {preview.subject}</p>
            <iframe title="Email preview" srcDoc={preview.html} className="h-[640px] w-full bg-slate-100" />
          </div>
        </div>
      </div>
    </>
  );
}
