"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CreditCard, Landmark, Lock, ShieldCheck, Smartphone, Ticket, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useSubmit } from "@/components/ui/useForm";
import { Alert } from "@/components/ui/Field";
import { cn, pkr, processingFee, COUNTRIES } from "@/lib/utils";
import { PROVINCES, maskCnic, maskPhone } from "@/lib/reg-fields";

type Cat = { id: number; label: string; fee: number; note: string | null; designations: string[] };
type Details = { whatsapp: string; cnic: string; address: string; city: string; province: string; country: string; qualification: string; employeeNo: string; pmdcNo: string };
type Item = { title: string; kind: "WORKSHOP" | "SESSION"; fee: number; left: number | null; when: string; tag: string | null };
const METHODS = [
  { k: "card", I: CreditCard, t: "Credit / debit card", s: "Visa · Mastercard" },
  { k: "wallet", I: Smartphone, t: "Mobile wallet", s: "JazzCash · EasyPaisa" },
  { k: "bank", I: Landmark, t: "Bank transfer", s: "Internet banking" },
];

export function CheckoutClient({ catalog, categories, processingPct, early, account, banquet }: {
  catalog: Record<string, Item>; categories: Cat[]; processingPct: number; early: boolean; account: Details; banquet: { fee: number; max: number };
}) {
  const router = useRouter();
  const { items: cart, remove, clear, ready } = useCart();
  const [designation, setDesignation] = useState("");
  const cat = categories.find((c) => c.designations.includes(designation))?.id ?? null;
  const [det, setDet] = useState<Details>(account);
  const [banq, setBanq] = useState(0);
  const [pass, setPass] = useState(true);
  const [method, setMethod] = useState("card");
  const [agree, setAgree] = useState(false);
  const { submit, loading, error, fields } = useSubmit<{ accessToken: string; regNo: string }>("/api/checkout");
  const setD = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setDet((p) => ({ ...p, [k]: k === "cnic" && (p.country || "Pakistan") === "Pakistan" ? maskCnic(e.target.value) : k === "whatsapp" ? maskPhone(e.target.value) : e.target.value }));
  const detailsOk = !!det.cnic.trim() && det.address.trim().length >= 5 && det.city.trim().length >= 2;
  const fe = (k: string) => fields[k] || fields[`details.${k}`];

  const lines = cart.map((c) => ({ id: c.id, cartTitle: c.title, live: catalog[c.id] }));
  const valid = lines.filter((l) => l.live && l.live.left !== 0);
  const invalid = lines.filter((l) => !l.live || l.live.left === 0);
  const category = categories.find((c) => c.id === cat);
  const passFee = pass && category ? category.fee : 0;
  const banquetTotal = banq * banquet.fee;
  const subtotal = passFee + banquetTotal + valid.reduce((a, l) => a + l.live!.fee, 0);
  const proc = processingFee(subtotal, processingPct);
  const total = subtotal + proc;
  const canPay = ready && !!category && detailsOk && (pass || valid.length > 0) && agree && invalid.length === 0;

  async function pay() {
    const r = await submit({ categoryId: cat, designation, sessionIds: valid.map((l) => l.id), includePass: pass, banquetQty: banq, paymentMethod: method, details: det });
    if (r) { clear(); router.push(`/register/success/${r.accessToken}?checkout=1`); }
  }

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-12">
      <div className="space-y-6 lg:col-span-7">
        {/* items */}
        <div className="hud p-6">
          <p className="eyebrow mb-4">Selected workshops &amp; sessions</p>
          {!ready ? <div className="h-20 animate-pulse rounded-2xl bg-white/5" /> : lines.length === 0 ? (
            <p className="text-sm text-slate-400">Your cart is empty. <Link href="/workshops" className="text-lnh-sky underline">Add workshops</Link> or <Link href="/register" className="text-lnh-sky underline">sessions</Link> — or check out with the symposium pass only.</p>
          ) : (
            <ul className="space-y-2">
              {lines.map((l) => (
                <li key={l.id} className={cn("flex items-start gap-3 rounded-2xl border p-3", l.live && l.live.left !== 0 ? "border-white/10 bg-white/[0.03]" : "border-lnh-red/40 bg-lnh-red/10")}>
                  <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", l.live?.kind === "WORKSHOP" ? "bg-lnh-gold" : "bg-lnh-sky")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{l.live?.title ?? l.cartTitle}</p>
                    <p className="text-[11px] text-slate-400">{l.live ? `${l.live.kind === "WORKSHOP" ? "Workshop" : "Scientific session"} · ${l.live.when}${l.live.tag ? ` · ${l.live.tag}` : ""}` : "No longer available"}{l.live?.left === 0 && " · Fully booked"}</p>
                  </div>
                  <p className="text-sm font-bold text-white">{l.live ? (l.live.fee ? pkr(l.live.fee) : "Included") : "—"}</p>
                  <button onClick={() => remove(l.id)} aria-label="Remove" className="text-slate-500 hover:text-lnh-rose"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          {invalid.length > 0 && <Alert className="mt-4 flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />Remove the highlighted item(s) to continue — they are full or no longer offered.</Alert>}
        </div>

        {/* pass */}
        <div className="hud p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow">Symposium pass &amp; category</p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="h-4 w-4 accent-[#B72025]" checked={pass} onChange={(e) => setPass(e.target.checked)} />Include symposium pass</label>
          </div>
          <p className="mt-2 text-xs text-slate-500">{pass ? "Covers keynotes, panels and ceremonies on all symposium days." : "Workshops only — category is still needed for your receipt and certificate."}{early ? " Early-bird rates applied." : ""}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block"><span className="label">Your designation <span className="text-lnh-red">*</span></span>
              <select className="input" value={designation} onChange={(e) => setDesignation(e.target.value)}>
                <option value="">Choose…</option>
                {categories.map((c) => <optgroup key={c.id} label={`${pkr(c.fee)}${early ? " (early bird)" : ""}`}>{c.designations.map((d) => <option key={d} value={d}>{d}</option>)}</optgroup>)}
              </select></label>
            <p className="pb-3 text-right font-display text-2xl font-bold text-white">{category ? (pass ? pkr(category.fee) : "—") : ""}</p>
          </div>
          {fe("designation") && <p className="err">{fe("designation")}</p>}
          <div className="mt-4 grid gap-2 text-[11px] text-slate-400 sm:grid-cols-2">{categories.map((c) => (
            <p key={c.id} className={cn("rounded-xl border px-3 py-2", category?.id === c.id ? "border-lnh-red/60 text-slate-200" : "border-white/10")}><b className="text-white">{pkr(c.fee)}</b> · {c.designations.join(", ")}</p>
          ))}</div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-4">
            <span className="text-sm text-slate-200">Additional banquet pass <span className="text-slate-400">({pkr(banquet.fee)} each, maximum {banquet.max})</span></span>
            <span className="flex items-center gap-2">
              {[["No", 0], ["Yes", Math.max(1, banq)]].map(([l, v]) => <button key={l} type="button" onClick={() => setBanq(Number(v))} className={cn("rounded-full border px-4 py-1.5 text-sm", (l === "No") === (banq === 0) ? "border-lnh-sky bg-lnh-sky/10 text-white" : "border-white/10 text-slate-300")}>{l}</button>)}
              {banq > 0 && <select aria-label="Banquet passes" value={banq} onChange={(e) => setBanq(Number(e.target.value))} className="input w-20 py-1.5">{Array.from({ length: banquet.max }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}</select>}
            </span>
          </div>
        </div>

        {/* registration form details */}
        <div className="hud p-6">
          <p className="eyebrow">Registration form details</p>
          <p className="mt-2 text-xs text-slate-500">As on the LNH symposium registration form. Saved to your account for next time.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
          <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />You will be taken to the PayPro payment page. Card details are never stored by LNH.</p>
        </div>
      </div>

      {/* ledger */}
      <aside className="lg:col-span-5">
        <div className="hud overflow-hidden lg:sticky lg:top-28">
          <div className="border-b border-white/10 bg-white/[0.04] px-6 py-4"><p className="font-display text-lg font-bold text-white">Registration summary &amp; ledger</p></div>
          <div className="space-y-2 p-6 text-sm">
            {pass && <div className="flex justify-between gap-3"><span className="flex items-center gap-2 text-slate-300"><Ticket className="h-4 w-4 text-lnh-red" />Symposium pass{designation ? ` — ${designation}` : ""}{early ? " (early bird)" : ""}</span><span className="shrink-0 whitespace-nowrap text-white">{category ? pkr(category.fee) : "Choose designation"}</span></div>}
            {banq > 0 && <div className="flex justify-between gap-3"><span className="text-slate-300">Additional banquet pass × {banq}</span><span className="shrink-0 whitespace-nowrap text-white">{pkr(banquetTotal)}</span></div>}
            {valid.map((l) => <div key={l.id} className="flex justify-between gap-3"><span className="text-slate-300">{l.live!.kind === "WORKSHOP" ? "Workshop" : "Session"}: {l.live!.title}</span><span className="shrink-0 whitespace-nowrap text-white">{l.live!.fee ? pkr(l.live!.fee) : "Included"}</span></div>)}
            <div className="flex justify-between border-t border-white/10 pt-3"><span className="text-slate-400">Subtotal</span><span className="text-white">{pkr(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Tax &amp; processing{processingPct ? ` (${processingPct}%)` : ""}</span><span className="text-white">{pkr(proc)}</span></div>
            <div className="flex items-baseline justify-between border-t border-white/10 pt-4"><span className="font-semibold uppercase tracking-wider text-white">Total</span><span className="font-display text-3xl font-bold text-lnh-rose">{pkr(total)}</span></div>
            <p className="mono pt-2 text-[11px] text-slate-500">A unique Registration ID (SYM-YYYY-NNNNN) is issued when you confirm.</p>
            {error && <Alert className="mt-3">{error}</Alert>}
            <label className="mt-3 flex cursor-pointer gap-3 text-xs text-slate-300"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#B72025]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />I confirm my details are correct and accept the registration and refund terms.</label>
            <button onClick={pay} disabled={!canPay || loading} className="btn-primary mt-4 w-full py-4"><Lock className="h-4 w-4" />{loading ? "Creating registration…" : `Complete registration & pay ${pkr(total)}`}</button>
            {(!category || !detailsOk) && <p className="text-center text-[11px] text-slate-500">{!category ? "Choose your designation" : "Complete the registration form details"} to continue.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
