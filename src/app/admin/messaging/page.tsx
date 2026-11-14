import Link from "next/link";
import { and, desc, inArray, ne, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import { cn, fmtDateTime } from "@/lib/utils";
import { notifyConfig, NOTIFY_MESSAGES, workerMode } from "@/lib/notify-config";
import { cancelQueued, retryMessage, saveMessaging, testMessage } from "./actions";

export const metadata = { title: "WhatsApp & SMS" };
export const dynamic = "force-dynamic";

const CH: Record<string, string> = { EMAIL: "Email", WHATSAPP: "WhatsApp", SMS: "SMS" };
const ST: Record<string, string> = { QUEUED: "bg-amber-100 text-amber-800", SENDING: "bg-sky-100 text-sky-800", FAILED: "bg-rose-100 text-rose-800" };

/** Super Admin (14.11.2026 Part C): eOcean xNotify for WhatsApp and SMS, template ID per message, sending limits, and the outbox. */
export default async function Messaging({ searchParams }: { searchParams: { saved?: string; err?: string; test?: string; msg?: string } }) {
  await requirePerm("messaging");
  const cfg = await notifyConfig();
  // mailbox test emails (Email settings) are sent directly, not through the queue
  const queued = and(inArray(s.notificationLog.status, ["QUEUED", "SENDING", "FAILED"]), sql`coalesce(${s.notificationLog.templateKey}, '') <> 'TEST'`);
  const [counts, queue, recent] = await Promise.all([
    db.select({ channel: s.notificationLog.channel, status: s.notificationLog.status, n: sql<number>`count(*)::int` }).from(s.notificationLog)
      .where(queued).groupBy(s.notificationLog.channel, s.notificationLog.status),
    db.select().from(s.notificationLog).where(queued).orderBy(desc(s.notificationLog.createdAt)).limit(60),
    db.select().from(s.notificationLog).where(and(ne(s.notificationLog.channel, "EMAIL"), inArray(s.notificationLog.status, ["SENT", "LOGGED", "CANCELLED"]))).orderBy(desc(s.notificationLog.createdAt)).limit(30),
  ]);
  const n = (st: string) => counts.filter((c) => c.status === st).reduce((a, c) => a + c.n, 0);
  const worker = workerMode();
  const [{ seen } = { seen: null }] = await db.select({ seen: s.notifySettings.workerSeenAt }).from(s.notifySettings); // fresh, not the 30 s settings cache
  const alive = !!seen && Date.now() - seen.getTime() < 120_000;
  return (
    <>
      <PageTitle title="WhatsApp & SMS" sub="Super Admin. eOcean (xNotify) sends WhatsApp and SMS messages from templates approved in your eOcean account. Every email and message goes through one queue with retries." />
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved.</p>}
      {searchParams.err && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{searchParams.err}</p>}
      {cfg.keyUnreadable && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">The saved API key cannot be read (the server secret changed). Enter it again.</p>}

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <div className="a-card p-4"><p className="text-xs text-slate-500">Sender</p>
          <p className={cn("mt-1 font-semibold", worker && !alive && "text-rose-700")}>{worker ? (alive ? "lnh-notifier running" : "lnh-notifier NOT running") : "Sent by the website"}</p>
          <p className="text-xs text-slate-500">{worker ? (seen ? `last seen ${fmtDateTime(seen)}` : "never seen") : "failed messages retried by the scheduled job"}</p></div>
        <div className="a-card p-4"><p className="text-xs text-slate-500">Waiting</p><p className="mt-1 text-2xl font-bold">{n("QUEUED") + n("SENDING")}</p></div>
        <div className="a-card p-4"><p className="text-xs text-slate-500">Failed (gave up)</p><p className={cn("mt-1 text-2xl font-bold", n("FAILED") > 0 && "text-rose-700")}>{n("FAILED")}</p></div>
        <div className="a-card p-4"><p className="text-xs text-slate-500">WhatsApp / SMS</p><p className="mt-1 font-semibold">{cfg.waEnabled ? "On" : "Off"} / {cfg.smsEnabled ? "On" : "Off"}</p></div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* key: a fresh form after every save, so a typed key never stays in the page */}
        <form key={`${cfg.updatedAt?.getTime() ?? 0}-${searchParams.err ?? ""}`} action={saveMessaging} className="a-card space-y-5 p-5" autoComplete="off">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="waEnabled" defaultChecked={cfg.waEnabled} />Send WhatsApp messages</label>
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="smsEnabled" defaultChecked={cfg.smsEnabled} />Send SMS through eOcean</label>
          </div>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="mb-2 font-display text-base font-bold">eOcean account</legend>
            <div className="sm:col-span-2"><label className="a-label">API address</label><input name="apiUrl" defaultValue={cfg.apiUrl} className="a-input font-mono text-sm" /></div>
            <div className="sm:col-span-2"><label className="a-label">API key (x-api-key)</label><input name="apiKey" type="password" autoComplete="new-password" placeholder={cfg.key ? `saved (hidden), ends in …${cfg.key.slice(-3)}; leave blank to keep` : "from eOcean"} className="a-input font-mono text-sm" />
              {cfg.key && <label className="mt-1 flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" name="removeKey" />Remove the saved key</label>}</div>
            <div><label className="a-label">Account ID (Bearer "id")</label><input name="authId" defaultValue={cfg.authId ?? ""} className="a-input font-mono text-sm" /></div>
            <div><label className="a-label">Username (Bearer "username")</label><input name="authUsername" defaultValue={cfg.authUsername ?? ""} className="a-input font-mono text-sm" /></div>
            <div><label className="a-label">WhatsApp channel name</label><input name="waChannel" defaultValue={cfg.waChannel} className="a-input" /></div>
            <div><label className="a-label">SMS channel name</label><input name="smsChannel" defaultValue={cfg.smsChannel} className="a-input" /></div>
          </fieldset>
          <fieldset>
            <legend className="mb-1 font-display text-base font-bold">Template ID per message</legend>
            <p className="mb-3 text-xs text-slate-500">eOcean templates have fixed text (no names or numbers). Leave a box empty to not send that message on that channel. The QR messages attach the participant's QR code image.</p>
            <div className="overflow-x-auto"><table className="a-table">
              <thead><tr><th>Message</th><th>WhatsApp template ID</th><th>SMS template ID</th></tr></thead>
              <tbody>{Object.entries(NOTIFY_MESSAGES).map(([k, m]) => { const t = cfg.templates[k] ?? {}; const free = "freeText" in m; return (
                <tr key={k}><td className="text-sm"><span className="font-medium">{m.label}</span><span className="block text-xs text-slate-500">{m.detail}</span></td>
                  <td>{free ? <span className="text-xs text-slate-400">not possible</span> : <input name={`wa_${k}`} defaultValue={t.wa ?? ""} className="a-input w-36 font-mono text-sm" />}</td>
                  <td>{free ? <span className="text-xs text-slate-400">SMS gateway</span> : <input name={`sms_${k}`} defaultValue={t.sms ?? ""} className="a-input w-36 font-mono text-sm" />}</td></tr>
              ); })}</tbody>
            </table></div>
          </fieldset>
          <fieldset className="grid gap-3 sm:grid-cols-3">
            <legend className="mb-2 font-display text-base font-bold">Sending limits</legend>
            <div><label className="a-label">Emails per minute</label><input name="emailPerMin" type="number" min={1} defaultValue={cfg.emailPerMin} className="a-input" /></div>
            <div><label className="a-label">WhatsApp + SMS per minute</label><input name="msgPerMin" type="number" min={1} defaultValue={cfg.msgPerMin} className="a-input" /></div>
            <div><label className="a-label">Attempts before giving up</label><input name="maxAttempts" type="number" min={1} max={20} defaultValue={cfg.maxAttempts} className="a-input" /></div>
            <p className="text-xs text-slate-500 sm:col-span-3">Limits apply in the lnh-notifier process. Retries after 1, 5, 15, 60, 180 and 360 minutes.</p>
          </fieldset>
          <div className="flex items-center gap-3"><button className="a-btn-primary">Save</button>{cfg.updatedAt && <span className="text-xs text-slate-500">Changed {fmtDateTime(cfg.updatedAt)} by {cfg.updatedBy}</span>}</div>
        </form>

        <aside className="space-y-4">
          <form action={testMessage} className="a-card space-y-3 p-5">
            <h2 className="font-display text-base font-bold">Send a test message</h2>
            {searchParams.test && <p className={cn("rounded-lg px-3 py-2 text-sm", searchParams.test === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{searchParams.msg}</p>}
            <div><label className="a-label">Mobile number</label><input name="phone" placeholder="03001234567" className="a-input" /></div>
            <div><label className="a-label">Message</label><select name="key" className="a-input">{Object.entries(NOTIFY_MESSAGES).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}</select></div>
            <button className="a-btn-ghost">Send test</button>
          </form>
          <div className="a-card p-5 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Sign-in codes and free-text messages</p>
            <p className="mt-1">Fixed templates cannot carry a code or a link, so those go by SMS only through the SMS gateway in the server file (SMS_API_URL), if eOcean gives one. Emails always carry them.</p>
          </div>
        </aside>
      </div>

      <div className="a-card mt-6 overflow-x-auto">
        <div className="flex items-center justify-between px-5 pt-4"><h2 className="font-display text-base font-bold">Queue: waiting and failed</h2><Link href="/admin/emails?tab=log" className="text-xs font-semibold text-lnh-blue hover:underline">All sent messages</Link></div>
        <table className="a-table mt-3">
          <thead><tr><th>Created</th><th>Channel</th><th>To</th><th>Message</th><th>Status</th><th /></tr></thead>
          <tbody>{queue.map((m) => (
            <tr key={m.id}>
              <td className="whitespace-nowrap text-xs">{fmtDateTime(m.createdAt)}</td>
              <td className="text-sm">{CH[m.channel] ?? m.channel}</td>
              <td className="text-sm">{m.to}</td>
              <td className="max-w-xs text-sm">{m.subject ?? NOTIFY_MESSAGES[m.templateKey as keyof typeof NOTIFY_MESSAGES]?.label ?? m.templateKey}{m.ref && <span className="block text-xs text-slate-500">{m.ref}</span>}</td>
              <td><span className={cn("badge", ST[m.status])}>{m.status}</span><span className="block text-xs text-slate-500">{m.attempts} attempt{m.attempts === 1 ? "" : "s"}{m.nextAttemptAt && m.status === "QUEUED" ? `, next ${fmtDateTime(m.nextAttemptAt)}` : ""}</span>
                {m.error && <span className="block max-w-xs text-xs text-rose-700">{m.error.slice(0, 160)}</span>}</td>
              <td className="whitespace-nowrap">{m.status !== "SENDING" && m.payload && <form action={retryMessage.bind(null, m.id)} className="inline"><button className="text-xs font-semibold text-lnh-blue hover:underline">Send now</button></form>}
                {m.status !== "SENDING" && <form action={cancelQueued.bind(null, m.id)} className="ml-3 inline"><button className="text-xs font-semibold text-rose-600 hover:underline">Cancel</button></form>}</td>
            </tr>
          ))}</tbody>
        </table>
        {!queue.length && <p className="p-6 text-center text-sm text-slate-400">Nothing waiting. Every message has been sent.</p>}
      </div>

      <div className="a-card mt-6 overflow-x-auto">
        <h2 className="px-5 pt-4 font-display text-base font-bold">Recent WhatsApp and SMS</h2>
        <table className="a-table mt-3">
          <thead><tr><th>Date and time</th><th>Channel</th><th>To</th><th>Message</th><th>Status</th></tr></thead>
          <tbody>{recent.map((m) => (
            <tr key={m.id}><td className="whitespace-nowrap text-xs">{fmtDateTime(m.sentAt ?? m.createdAt)}</td><td className="text-sm">{CH[m.channel] ?? m.channel}</td><td className="text-sm">{m.to}</td>
              <td className="max-w-md text-sm">{NOTIFY_MESSAGES[m.templateKey as keyof typeof NOTIFY_MESSAGES]?.label ?? m.templateKey}{m.ref && <span className="block text-xs text-slate-500">{m.ref}</span>}</td>
              <td className="text-xs">{m.status === "LOGGED" ? "Recorded only (no SMS gateway)" : m.status}{m.providerRef && <span className="block text-slate-500">eOcean ref {m.providerRef}</span>}</td></tr>
          ))}</tbody>
        </table>
        {!recent.length && <p className="p-6 text-center text-sm text-slate-400">None yet.</p>}
      </div>
    </>
  );
}
