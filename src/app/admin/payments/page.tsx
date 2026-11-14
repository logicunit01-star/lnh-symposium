import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { DEMO_BASE, paymentConfig, readPaymentRow, unseal } from "@/lib/payment-config";
import { PageTitle } from "@/components/admin/ui";
import { appUrl, cn, fmtDateTime } from "@/lib/utils";
import { savePayments, testPayments } from "./actions";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

const MODES = [
  ["OFF", "Off: bank transfer", "No online payment. Participants see the bank details; the desk marks payments as received."],
  ["DEMO", "PayPro demo", "PayPro's test system (demoapi.paypro.com.pk). No real money; use it to test before going live."],
  ["LIVE", "PayPro live", "Real payments by card, bank app, ATM and over the counter."],
  ["", "Server settings file", "Use PAYMENT_PROVIDER and PAYPRO_* from the server's protected settings file (how it worked before this screen)."],
] as const;

/** Super Admin only (14 Nov 2026): PayPro switch and credentials. Saved values are encrypted and never shown again. */
export default async function Payments({ searchParams }: { searchParams: { saved?: string; err?: string; test?: string; result?: string } }) {
  const u = await requirePerm("payments");
  const [me] = await db.select({ role: s.users.role }).from(s.users).where(eq(s.users.id, u.sub));
  if (me?.role !== "SUPER_ADMIN") redirect("/admin?denied=1");
  const [row, cfg] = await Promise.all([readPaymentRow(), paymentConfig()]);
  const sec = unseal(row?.secrets);
  const has = (v?: string) => !!v;
  const idHint = (v?: string) => (v ? `saved, ends in …${v.slice(-3)}` : "not set");
  const set = (k: "demo" | "live") => sec?.[k] ?? {};
  const Status = ({ ok }: { ok: boolean }) => <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", ok ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500")}>{ok ? "Saved" : "Not set"}</span>;
  const Set = ({ k, title }: { k: "demo" | "live"; title: string }) => {
    const x = set(k);
    const complete = has(x.clientId) && has(x.clientSecret) && has(x.merchantId) && (k === "demo" || has(x.baseUrl));
    return (
      <section className="a-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold">{title}</h2>
          <div className="flex items-center gap-2"><Status ok={complete} />
            {has(x.clientId) && <button formAction={testPayments.bind(null, k)} formNoValidate className="a-btn-ghost py-1 text-xs">Test connection</button>}</div>
        </div>
        {searchParams.test === k && <p className={cn("mt-3 rounded-lg px-3 py-2 text-sm", searchParams.result === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>
          {searchParams.result === "ok" ? "Connected: PayPro accepted these credentials." : searchParams.result === "missing" ? "Enter the client ID and secret first." : "PayPro did not accept these credentials, or could not be reached."}</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="a-label">API address</label>
            <input name={`${k}_baseUrl`} type="url" autoComplete="off" className="a-input font-mono text-sm" placeholder={x.baseUrl ? `${x.baseUrl} (saved)` : k === "demo" ? `${DEMO_BASE} (default)` : "https://… (from PayPro, required for live)"} /></div>
          <div><label className="a-label">Client ID</label><input name={`${k}_clientId`} autoComplete="off" spellCheck={false} className="a-input font-mono text-sm" placeholder={idHint(x.clientId)} /></div>
          <div><label className="a-label">Client secret</label><input name={`${k}_clientSecret`} type="password" autoComplete="new-password" className="a-input font-mono text-sm" placeholder={x.clientSecret ? "saved (hidden)" : "not set"} /></div>
          <div><label className="a-label">Merchant username</label><input name={`${k}_merchantId`} autoComplete="off" spellCheck={false} className="a-input font-mono text-sm" placeholder={x.merchantId ? "saved (hidden)" : "not set"} /></div>
          <label className="flex items-end gap-2 pb-2 text-xs text-slate-500"><input type="checkbox" name={`${k}_remove`} />Remove the saved {k} credentials</label>
        </div>
      </section>
    );
  };
  const current = cfg.source === "server" ? `Server settings file (${cfg.provider})` : MODES.find(([v]) => v === cfg.mode)?.[1];
  return (
    <>
      <PageTitle title="Payments" sub="Super Admin only. Choose how participants pay, and keep the PayPro credentials. Saved credentials are encrypted and never shown again; leave a field blank to keep what is saved." />
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved. The new setting applies to new payments straight away.</p>}
      {searchParams.err && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{searchParams.err}</p>}
      {sec === null && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">The saved credentials cannot be read (the server secret was changed). Enter them again.</p>}
      <div className="mb-4 a-card flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
        <p>Now: <b>{current}</b>{cfg.provider === "paypro" && !cfg.paypro && <span className="ml-2 font-semibold text-rose-700">credentials incomplete: online payment will fail</span>}</p>
        {row?.updatedAt && <p className="text-xs text-slate-500">Last changed {fmtDateTime(row.updatedAt)} by {row.updatedBy}</p>}
      </div>
      {/* key: a new form after every save or test, so typed credentials never stay in the page */}
      <form key={`${row?.updatedAt?.getTime() ?? 0}-${searchParams.saved ?? ""}-${searchParams.err ?? ""}-${searchParams.test ?? ""}-${searchParams.result ?? ""}`} action={savePayments} className="space-y-4" autoComplete="off">
        <section className="a-card p-5">
          <h2 className="font-display text-base font-bold">Payment mode</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{MODES.map(([v, l, d]) => (
            <label key={v || "file"} className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-3 has-[:checked]:border-lnh-blue has-[:checked]:bg-lnh-blue/5">
              <input type="radio" name="mode" value={v} defaultChecked={(row?.mode ?? "") === v} className="mt-1" />
              <span><span className="block text-sm font-semibold">{l}</span><span className="text-xs text-slate-500">{d}</span></span>
            </label>
          ))}</div>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="confirm_live" />I confirm switching to PayPro live takes real payments.</label>
        </section>
        <Set k="demo" title="PayPro demo credentials" />
        <Set k="live" title="PayPro live credentials" />
        <section className="a-card p-5">
          <div className="flex items-center justify-between"><h2 className="font-display text-base font-bold">PayPro callback (bank, ATM and over-the-counter payments)</h2><Status ok={has(sec?.callback?.username) && has(sec?.callback?.password)} /></div>
          <p className="mt-1 text-sm text-slate-600">Give PayPro this address with the username and password below: <code className="rounded bg-slate-100 px-1.5 py-0.5">{appUrl()}/paypro/uis</code>. Pending PayPro orders are also checked with PayPro every 15 minutes, so payments are confirmed even if the callback is not set up.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className="a-label">Callback username</label><input name="cb_username" autoComplete="off" className="a-input font-mono text-sm" placeholder={sec?.callback?.username ? "saved (hidden)" : "not set"} /></div>
            <div><label className="a-label">Callback password (min 12 characters)</label><input name="cb_password" type="password" autoComplete="new-password" className="a-input font-mono text-sm" placeholder={sec?.callback?.password ? "saved (hidden)" : "not set"} /></div>
            <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" name="cb_remove" />Remove the saved callback credentials</label>
          </div>
        </section>
        <div className="flex flex-wrap items-center gap-3"><button className="a-btn-primary">Save payment settings</button>
          <p className="text-xs text-slate-500">"Test connection" uses the saved credentials: save first, then test. Testing only signs in; nothing is created or charged.</p></div>
      </form>
    </>
  );
}
