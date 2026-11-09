"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CreditCard, Landmark, Lock, ShieldCheck, Smartphone, Ticket, Trash2, Utensils, Wrench } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useSubmit } from "@/components/ui/useForm";
import { Alert } from "@/components/ui/Field";
import { cn, pkr, processingFee, COUNTRIES, SPECIALTIES } from "@/lib/utils";
import { PROVINCES, maskCnic, maskPhone } from "@/lib/reg-fields";

type Cat = { id: number; label: string; fee: number; note: string | null; designations: string[] };
type Details = { gender: string; institution: string; specialty: string; whatsapp: string; cnic: string; address: string; city: string; province: string; country: string; qualification: string; employeeNo: string; pmdcNo: string };
type Item = { title: string; kind: "WORKSHOP"; fee: number; left: number | null; when: string; tag: string | null };
const METHODS = [
  { k: "card", I: CreditCard, t: "Credit / debit card", s: "Visa · Mastercard" },
  { k: "wallet", I: Smartphone, t: "Mobile wallet", s: "JazzCash · EasyPaisa" },
  { k: "bank", I: Landmark, t: "Bank transfer", s: "Internet banking" },
];

/**
 * Checkout (registration redesign, release 1): a read-only order built on the register page
 * (Symposium Pass with designation and extra banquet passes, workshop tickets), registration details, payment.
 */
export function CheckoutClient({ welcome = false, contact, catalog, categories, processingPct, early, account, banquet }: {
  welcome?: boolean; contact?: string | null;
  catalog: Record<string, Item>; categories: Cat[]; processingPct: number; early: boolean; account: Details; banquet: { fee: number; max: number };
}) {
  const router = useRouter();
  const { items: cart, pass, held, remove, setPass, clear, ready } = useCart();
  const [det, setDet] = useState<Details>(account);
  const [method, setMethod] = useState("card");
  const [agree, setAgree] = useState(false);
  // Workshop-only buyers without a pass still give a designation: it prints on the receipt and certificate
  const [wsDesignation, setWsDesignation] = useState("");
  const { submit, loading, error, fields } = useSubmit<{ accessToken: string; regNo: string }>("/api/checkout");
  const setD = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDet((p) => ({ ...p, [k]: k === "cnic" && (p.country || "Pakistan") === "Pakistan" ? maskCnic(e.target.value) : k === "whatsapp" ? maskPhone(e.target.value) : e.target.value }));
  const detailsOk = !!det.gender && det.institution.trim().length >= 2 && !!det.cnic.trim() && det.address.trim().length >= 5 && det.city.trim().length >= 2;
  const fe = (k: string) => fields[k] || fields[`details.${k}`];

  const lines = cart.map((c) => ({ id: c.id, cartTitle: c.title, live: catalog[c.id] }));
  const valid = lines.filter((l) => l.live && l.live.left !== 0);
  const invalid = lines.filter((l) => !l.live || l.live.left === 0);
  const passCat = pass ? categories.find((c) => c.id === pass.categoryId && c.designations.includes(pass.designation)) ?? null : null;
  const designation = pass ? pass.designation : held?.designation ?? wsDesignation;
  const categoryId = pass ? passCat?.id ?? null : held ? held.categoryId : categories.find((c) => c.designations.includes(wsDesignation))?.id ?? null;
  const passFee = passCat ? passCat.fee : 0;
  const extra = pass ? Math.min(banquet.max, pass.extraBanquet) : 0;
  const banquetTotal = extra * banquet.fee;
  const subtotal = passFee + banquetTotal + valid.reduce((a, l) => a + l.live!.fee, 0);
  const proc = processingFee(subtotal, processingPct);
  const total = subtotal + proc;
  const empty = !pass && lines.length === 0;
  const canPay = ready && !empty && !!categoryId && !!designation && (!pass || !!passCat) && detailsOk && agree && invalid.length === 0;

  async function pay() {
    const r = await submit({ categoryId, designation, sessionIds: valid.map((l) => l.id), includePass: !!pass, banquetQty: extra, paymentMethod: method, details: det });
    if (r) { clear(); router.push(`/register/success/${r.accessToken}?checkout=1`); }
  }

  if (ready && empty) return (
    <div className="hud mt-10 p-10 text-center">
      <p className="font-display text-xl font-bold text-white">Your order is empty</p>
      <p className="mt-2 text-sm text-slate-300">{held ? `You hold a Symposium Pass (${held.regNo}). Add a workshop ticket to continue.` : "Choose your Symposium Pass or add workshop tickets first."}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {!held && <Link href="/register#pass" className="btn-primary">Choose your pass</Link>}
        <Link href="/register#workshops" className="btn-ghost">Browse workshops</Link>
      </div>
    </div>
  );

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-12">
      {welcome && ready && (
        <div role="status" className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm text-emerald-100 lg:col-span-12">
          Signed in. {[pass ? "Your Symposium Pass" : null, cart.length ? `${cart.length} workshop ticket${cart.length === 1 ? "" : "s"}` : null].filter(Boolean).join(" and ")} {pass && cart.length ? "are" : "is"} still selected.
        </div>
      )}
      <div className="space-y-6 lg:col-span-7">
        {/* order (read only; changed on the register page) */}
        <div className="hud p-6">
          <div className="flex items-center justify-between gap-3"><p className="eyebrow">Your order</p><Link href="/register" className="min-h-[44px] content-center text-sm text-lnh-sky underline">Change</Link></div>
          {!ready ? <div className="mt-4 h-20 animate-pulse rounded-2xl bg-white/5" /> : (
            <ul className="mt-4 space-y-2">
              {held && !pass && (
                <li className="flex items-start gap-3 rounded-2xl border border-lnh-sky/30 p-3 text-sm">
                  <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-lnh-sky" />
                  <span className="flex-1 text-slate-200"><b className="text-white">Symposium Pass</b> · already yours ({held.regNo}). Not charged again.</span>
                  <span className="text-sm font-bold text-white">{pkr(0)}</span>
                </li>
              )}
              {pass && (
                <li className={cn("rounded-2xl border p-3", passCat ? "border-lnh-sky/40 bg-lnh-sky/[0.08]" : "border-lnh-red/40 bg-lnh-red/10")}>
                  <div className="flex items-start gap-3">
                    <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-lnh-sky" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">Symposium Pass · {pass.designation}</p>
                      <p className="text-xs text-slate-300">{passCat ? `All sessions, all 3 days · 1 banquet pass included${early ? " · early-bird price" : ""}` : "This designation is no longer offered. Choose your pass again."}</p>
                    </div>
                    <p className="text-sm font-bold text-white">{passCat ? pkr(passFee) : "—"}</p>
                    <button onClick={() => setPass(null)} aria-label="Remove Symposium Pass" className="grid h-9 w-9 place-items-center rounded-full text-slate-300 hover:text-lnh-rose"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {extra > 0 && <p className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-xs text-slate-300"><span className="flex items-center gap-1.5"><Utensils className="h-3.5 w-3.5" />Extra banquet pass × {extra}</span><b className="text-white">{pkr(banquetTotal)}</b></p>}
                </li>
              )}
              {lines.map((l) => (
                <li key={l.id} className={cn("flex items-start gap-3 rounded-2xl border p-3", l.live && l.live.left !== 0 ? "border-lnh-gold/30 bg-lnh-gold/[0.06]" : "border-lnh-red/40 bg-lnh-red/10")}>
                  <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-lnh-gold" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{l.live?.title ?? l.cartTitle}</p>
                    <p className="text-xs text-slate-300">{l.live ? `Workshop ticket · ${l.live.when}${l.live.tag ? ` · ${l.live.tag}` : ""}` : "No longer available"}{l.live?.left === 0 && " · Fully booked"}</p>
                  </div>
                  <p className="text-sm font-bold text-white">{l.live ? pkr(l.live.fee) : "—"}</p>
                  <button onClick={() => remove(l.id)} aria-label={`Remove ${l.cartTitle}`} className="grid h-9 w-9 place-items-center rounded-full text-slate-300 hover:text-lnh-rose"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          {invalid.length > 0 && <Alert className="mt-4 flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />Remove the highlighted workshop(s) to continue: they are full or no longer offered.</Alert>}
          {!pass && !held && lines.length > 0 && (
            <div className="mt-5 rounded-2xl border border-white/15 p-4">
              <label className="block"><span className="label">Your designation <span className="text-lnh-red">*</span></span>
                <select className="input" value={wsDesignation} onChange={(e) => setWsDesignation(e.target.value)}>
                  <option value="">Choose…</option>
                  {categories.flatMap((c) => c.designations).map((d) => <option key={d} value={d}>{d}</option>)}
                </select></label>
              <p className="mt-2 text-xs text-slate-300">Workshop tickets only: no Symposium Pass is included. Your designation prints on your receipt and certificate. <Link href="/register#pass" className="text-lnh-sky underline">Add a Symposium Pass</Link></p>
              {fe("designation") && <p className="err">{fe("designation")}</p>}
            </div>
          )}
        </div>

        {/* registration form details */}
        <div className="hud p-6">
          <p className="eyebrow">Registration form details</p>
          <p className="mt-2 text-xs text-slate-400">As on the LNH symposium registration form. Saved to your account for next time.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="block"><span className="label">Gender <span className="text-lnh-red">*</span></span>
              <div className="flex gap-2" role="radiogroup" aria-label="Gender">{["Male", "Female"].map((g) => (
                <button key={g} type="button" role="radio" aria-checked={det.gender === g} onClick={() => setDet((p) => ({ ...p, gender: g }))}
                  className={cn("min-h-[44px] flex-1 rounded-xl border px-4 text-sm transition", det.gender === g ? "border-lnh-sky bg-lnh-sky/10 font-semibold text-white" : "border-white/15 text-slate-200 hover:border-white/40")}>{g}</button>))}
              </div>{fe("gender") && <span className="err">{fe("gender")}</span>}</div>
            <label className="block"><span className="label">Hospital / institution <span className="text-lnh-red">*</span></span><input className="input" value={det.institution} onChange={setD("institution")} autoComplete="organization" />{fe("institution") && <span className="err">{fe("institution")}</span>}</label>
            <label className="block"><span className="label">Specialty</span><input className="input" list="specialties" value={det.specialty} onChange={setD("specialty")} /><datalist id="specialties">{SPECIALTIES.map((x) => <option key={x} value={x} />)}</datalist></label>
            <label className="block"><span className="label">Country</span><select className="input" value={det.country || "Pakistan"} onChange={setD("country")}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="block"><span className="label">{(det.country || "Pakistan") === "Pakistan" ? "CNIC no." : "Passport no."} <span className="text-lnh-red">*</span></span><input className="input mono" inputMode={(det.country || "Pakistan") === "Pakistan" ? "numeric" : "text"} placeholder={(det.country || "Pakistan") === "Pakistan" ? "12345-1234567-1" : ""} value={det.cnic} onChange={setD("cnic")} />{fe("cnic") && <span className="err">{fe("cnic")}</span>}</label>
            <label className="block sm:col-span-2"><span className="label">Address <span className="text-lnh-red">*</span></span><input className="input" value={det.address} onChange={setD("address")} autoComplete="street-address" />{fe("address") && <span className="err">{fe("address")}</span>}</label>
            <label className="block"><span className="label">Province</span>{(det.country || "Pakistan") === "Pakistan" ? <select className="input" value={det.province} onChange={setD("province")}><option value="">Choose…</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select> : <input className="input" value={det.province} onChange={setD("province")} />}</label>
            <label className="block"><span className="label">City <span className="text-lnh-red">*</span></span><input className="input" value={det.city} onChange={setD("city")} />{fe("city") && <span className="err">{fe("city")}</span>}</label>
            <label className="block"><span className="label">WhatsApp no.</span><input className="input mono" inputMode="numeric" placeholder="03XX-XXXXXXX" value={det.whatsapp} onChange={setD("whatsapp")} />{fe("whatsapp") && <span className="err">{fe("whatsapp")}</span>}</label>
            <label className="block"><span className="label">PMDC no. (medical doctors only)</span><input className="input" value={det.pmdcNo} onChange={setD("pmdcNo")} /></label>
            <label className="block"><span className="label">Highest academic qualification</span><input className="input" value={det.qualification} onChange={setD("qualification")} placeholder="e.g. MBBS, FCPS" /></label>
            <label className="block"><span className="label">Employee # (LNH staff only)</span><input className="input mono" value={det.employeeNo} onChange={setD("employeeNo")} /></label>
          </div>
        </div>

        {/* payment */}
        <div className="hud p-6">
          <p className="eyebrow">Payment method · secured by PayPro</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {METHODS.map(({ k, I, t, s }) => (
              <button key={k} onClick={() => setMethod(k)} className={cn("rounded-2xl border p-4 text-left transition", method === k ? "border-lnh-sky bg-lnh-sky/10 shadow-[0_0_24px_-10px_#3FB8F0]" : "border-white/10 hover:border-white/30")}>
                <I className={cn("h-6 w-6", method === k ? "text-lnh-sky" : "text-slate-400")} />
                <p className="mt-3 text-sm font-semibold text-white">{t}</p><p className="text-[11px] text-slate-400">{s}</p>
              </button>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />You will be taken to the PayPro payment page. Card details are never stored by LNH.</p>
          {contact && <p className="mt-1 text-xs text-slate-400">Payment problem? Email the symposium secretariat at <a href={`mailto:${contact}`} className="text-lnh-sky underline">{contact}</a> with your registration number.</p>}
        </div>
      </div>

      {/* ledger */}
      <aside className="lg:col-span-5">
        <div className="hud overflow-hidden lg:sticky lg:top-28">
          <div className="border-b border-white/10 bg-white/[0.04] px-6 py-4"><p className="font-display text-lg font-bold text-white">Payment summary</p></div>
          <div className="space-y-2 p-6 text-sm">
            {pass && passCat && <div className="flex justify-between gap-3"><span className="text-slate-300">Symposium Pass · {pass.designation}{early ? " (early bird)" : ""}</span><span className="shrink-0 whitespace-nowrap text-white">{pkr(passFee)}</span></div>}
            {extra > 0 && <div className="flex justify-between gap-3"><span className="text-slate-300">Extra banquet pass × {extra}</span><span className="shrink-0 whitespace-nowrap text-white">{pkr(banquetTotal)}</span></div>}
            {valid.map((l) => <div key={l.id} className="flex justify-between gap-3"><span className="text-slate-300">Workshop: {l.live!.title}</span><span className="shrink-0 whitespace-nowrap text-white">{pkr(l.live!.fee)}</span></div>)}
            <div className="flex justify-between border-t border-white/10 pt-3"><span className="text-slate-300">Subtotal</span><span className="text-white">{pkr(subtotal)}</span></div>
            {proc > 0 && <div className="flex justify-between"><span className="text-slate-300">Payment processing{processingPct ? ` (${processingPct}%)` : ""}</span><span className="text-white">{pkr(proc)}</span></div>}
            <div className="flex items-baseline justify-between border-t border-white/10 pt-4"><span className="font-semibold uppercase tracking-wider text-white">Total</span><span className="font-display text-3xl font-bold text-lnh-rose">{pkr(total)}</span></div>
            <p className="mono pt-2 text-xs text-slate-400">{held ? `This order is added to your registration ${held.regNo}.` : "A registration number (SYM-YYYY-NNNNN) is issued when you confirm."}</p>
            {error && <Alert className="mt-3">{error}</Alert>}
            <label className="mt-3 flex cursor-pointer gap-3 text-xs text-slate-200"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#B72025]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />I confirm my details are correct and agree to the registration terms.</label>
            <button onClick={pay} disabled={!canPay || loading} className="btn-primary mt-4 w-full py-4"><Lock className="h-4 w-4" />{loading ? "Creating registration…" : `Confirm and pay ${pkr(total)}`}</button>
            {ready && !canPay && <p className="text-center text-xs text-slate-400">{!designation ? "Choose your designation" : !detailsOk ? "Complete the registration details (gender, institution, CNIC, address, city)" : invalid.length ? "Remove the unavailable workshop(s)" : !agree ? "Tick the confirmation box" : ""}{(!designation || !detailsOk || invalid.length || !agree) ? " to continue." : ""}</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
