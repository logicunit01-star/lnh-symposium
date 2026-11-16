import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import { cn, fmtDateTime } from "@/lib/utils";
import { deleteMailAccount, saveMailAccount, saveMailMode, testMailAccount } from "./actions";

export const metadata = { title: "Email settings" };
export const dynamic = "force-dynamic";

const MODES = [
  ["SEND", "Send emails", "Every notification is delivered to its recipient."],
  ["TEST", "Test mode", "Every email goes to one test address instead of the real recipient (subject shows who it was for)."],
  ["LOG", "Log only", "Nothing is sent; emails are only recorded under Automated emails → Sent emails."],
] as const;
const SECURITY = [["SSL", "SSL/TLS (port 465, recommended)"], ["STARTTLS", "STARTTLS (port 587)"], ["NONE", "None (not recommended)"]] as const;

/** Super Admin and Admin (14 Nov 2026): mailboxes used to send emails, and the delivery mode. Passwords are encrypted, never shown. */
export default async function EmailSettings({ searchParams }: { searchParams: { a?: string; saved?: string; err?: string; test?: string; msg?: string } }) {
  const u = await requirePerm("mail");
  const [[mode], accounts, usage] = await Promise.all([
    db.select().from(s.mailSettings).where(eq(s.mailSettings.id, 1)),
    db.select().from(s.mailAccounts).orderBy(desc(s.mailAccounts.isDefault), asc(s.mailAccounts.label)),
    db.select({ id: s.emailTemplates.accountId, n: sql<number>`count(*)::int` }).from(s.emailTemplates).groupBy(s.emailTemplates.accountId),
  ]);
  const cur = mode?.mode ?? "SEND";
  const sel = searchParams.a === "new" ? null : accounts.find((a) => a.id === searchParams.a) ?? null;
  const editing = searchParams.a === "new" || !!sel;
  const used = (id: string) => usage.find((x) => x.id === id)?.n ?? 0;
  const envFallback = !accounts.some((a) => a.active) && !!process.env.SMTP_HOST;
  return (
    <>
      <PageTitle title="Email settings" sub="Super Admin and Admin. The mailboxes the site sends from, and how emails are delivered. Choose which mailbox, sender name, CC and reply-to each notification uses in Automated emails." />
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{searchParams.saved === "deleted" ? "Mailbox removed." : "Saved."}</p>}
      {searchParams.err && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{searchParams.err}</p>}
      {accounts.some((a) => !a.secret) && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{accounts.filter((a) => !a.secret).length} mailbox(es) are ready but switched off until their password is entered: {accounts.filter((a) => !a.secret).map((a) => a.username).join(", ")}. Open each one, type the password and save; then press “Send test email”. Until then their notifications are sent from an active mailbox.</p>}
      {!accounts.some((a) => a.active) && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">No active mailbox yet{envFallback ? ": emails use the SMTP settings in the server file." : ": emails are only recorded, not delivered. Add the registration mailbox below."}</p>}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <form action={saveMailMode} className="a-card p-5">
            <h2 className="font-display text-base font-bold">Delivery</h2>
            <div className="mt-3 grid gap-2 md:grid-cols-3">{MODES.map(([v, l, d]) => (
              <label key={v} className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-3 has-[:checked]:border-lnh-blue has-[:checked]:bg-lnh-blue/5">
                <input type="radio" name="mode" value={v} defaultChecked={cur === v} className="mt-1" />
                <span><span className="block text-sm font-semibold">{l}</span><span className="text-xs text-slate-500">{d}</span></span>
              </label>
            ))}</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div><label className="a-label">Test address (for Test mode)</label><input name="testAddress" type="email" defaultValue={mode?.testAddress ?? u.email} className="a-input" /></div>
              <button className="a-btn-primary">Save delivery</button>
            </div>
            {mode?.updatedAt && <p className="mt-2 text-xs text-slate-500">Changed {fmtDateTime(mode.updatedAt)} by {mode.updatedBy}</p>}
          </form>

          <div className="a-card overflow-x-auto">
            <div className="flex items-center justify-between px-5 pt-4"><h2 className="font-display text-base font-bold">Mailboxes</h2><Link href="/admin/email-settings?a=new" className="a-btn-primary py-1.5 text-xs">+ Add mailbox</Link></div>
            <table className="a-table mt-3">
              <thead><tr><th>Mailbox</th><th>Sends as</th><th>Server</th><th>Notifications</th><th /></tr></thead>
              <tbody>{accounts.map((a) => (
                <tr key={a.id} className={cn(!a.active && "opacity-50", sel?.id === a.id && "bg-lnh-blue/5")}>
                  <td className="font-medium">{a.label}{a.isDefault && <span className="badge ml-2 bg-emerald-100 text-emerald-800">Default</span>}{!a.secret ? <span className="badge ml-2 bg-amber-100 text-amber-800">Password needed</span> : !a.active && <span className="ml-1 text-xs text-slate-400">(off)</span>}</td>
                  <td className="text-sm">{a.fromName}<span className="block text-xs text-slate-500">{a.fromAddress}</span></td>
                  <td className="text-xs text-slate-600">{a.host}:{a.port} · {a.security}</td>
                  <td className="text-xs">{a.isDefault ? "All not set to another mailbox" : `${used(a.id)} chosen`}</td>
                  <td><Link href={`/admin/email-settings?a=${a.id}`} className="text-xs font-semibold text-lnh-blue hover:underline">Edit / test</Link></td>
                </tr>
              ))}</tbody>
            </table>
            {!accounts.length && <p className="p-6 text-center text-sm text-slate-400">No mailbox yet.</p>}
          </div>
          <p className="text-xs text-slate-500">Emails must be sent from the mailbox's own address (or one the mail server allows for it); otherwise receiving servers may reject them or mark them as spam. Ask LNH IT to set SPF and DKIM for symposium2027.lnh.edu.pk.</p>
        </div>

        <aside className="space-y-4">
          {editing ? (
            <>
              {/* key: a fresh form after every save, so a typed password never stays in the page */}
              <form key={`${sel?.id ?? "new"}-${sel?.updatedAt?.getTime() ?? 0}-${searchParams.err ?? ""}`} action={saveMailAccount.bind(null, sel?.id ?? null)} className="a-card space-y-3 p-5" autoComplete="off">
                <h2 className="font-display text-base font-bold">{sel ? `Edit ${sel.label}` : "New mailbox"}</h2>
                <div><label className="a-label">Name in this list</label><input name="label" defaultValue={sel?.label ?? "Registration"} className="a-input" /></div>
                <div className="grid grid-cols-[1fr_90px] gap-3">
                  <div><label className="a-label">Outgoing (SMTP) server</label><input name="host" required defaultValue={sel?.host ?? "symposium2027.lnh.edu.pk"} className="a-input font-mono text-sm" /></div>
                  <div><label className="a-label">Port</label><input name="port" type="number" defaultValue={sel?.port ?? 465} className="a-input" /></div>
                </div>
                <div><label className="a-label">Security</label><select name="security" defaultValue={sel?.security ?? "SSL"} className="a-input">{SECURITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                <div><label className="a-label">Username</label><input name="username" required defaultValue={sel?.username ?? ""} placeholder="registration@symposium2027.lnh.edu.pk" autoComplete="off" className="a-input font-mono text-sm" /></div>
                <div><label className="a-label">Password</label><input name="password" type="password" autoComplete="new-password" placeholder={sel?.secret ? "saved (hidden); leave blank to keep" : "the mailbox password"} className="a-input font-mono text-sm" /></div>
                <div><label className="a-label">Sender name</label><input name="fromName" defaultValue={sel?.fromName ?? "9th LNH Symposium"} className="a-input" /></div>
                <div><label className="a-label">Sender address</label><input name="fromAddress" type="email" defaultValue={sel?.fromAddress ?? ""} placeholder="same as the username" className="a-input" /></div>
                <div><label className="a-label">Reply-to (optional)</label><input name="replyTo" type="email" defaultValue={sel?.replyTo ?? ""} placeholder="where replies should go" className="a-input" /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault" defaultChecked={sel ? sel.isDefault : !accounts.length} />Default mailbox (used by every notification not set to another one)</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={sel?.active ?? true} />Active</label>
                <div className="flex flex-wrap gap-2"><button className="a-btn-primary">Save mailbox</button><Link href="/admin/email-settings" className="a-btn-ghost">Close</Link></div>
                {sel && <button formAction={deleteMailAccount.bind(null, sel.id)} formNoValidate className="text-xs font-semibold text-rose-600 hover:underline">Remove this mailbox</button>}
                {sel?.updatedAt && <p className="text-xs text-slate-500">Changed {fmtDateTime(sel.updatedAt)} by {sel.updatedBy}</p>}
              </form>
              {sel && (
                <form action={testMailAccount.bind(null, sel.id)} className="a-card space-y-3 p-5">
                  <h2 className="font-display text-base font-bold">Send a test email</h2>
                  <p className="text-xs text-slate-500">Signs in to the mail server and sends one email from this mailbox, whatever the delivery mode.</p>
                  {searchParams.test && <p className={cn("rounded-lg px-3 py-2 text-sm", searchParams.test === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>{searchParams.test === "ok" ? "" : "Could not send: "}{searchParams.msg}</p>}
                  <div><label className="a-label">Send to</label><input name="testTo" type="email" defaultValue={u.email} className="a-input" /></div>
                  <button className="a-btn-ghost">Send test email</button>
                </form>
              )}
            </>
          ) : (
            <div className="a-card p-5 text-sm text-slate-600">
              <p>Choose a mailbox to edit or test it, or add one.</p>
              <p className="mt-3 text-xs text-slate-500">LNH settings: server <code>symposium2027.lnh.edu.pk</code>, port 465 with SSL/TLS (or 587 with STARTTLS), username = the full email address.</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
