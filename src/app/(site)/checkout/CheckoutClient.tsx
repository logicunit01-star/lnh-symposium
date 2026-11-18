"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CreditCard, Landmark, Lock, ShieldCheck, Smartphone, Ticket, Trash2, Utensils, Wrench } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useSubmit } from "@/components/ui/useForm";
import { Alert } from "@/components/ui/Field";
import { cn, pkr, processingFee, COUNTRIES, SPECIALTIES, TITLES } from "@/lib/utils";
import { PROVINCES, maskCnic, DIAL } from "@/lib/reg-fields";
import { PhoneInput, splitPhone, joinPhone } from "@/components/ui/PhoneInput";

type Cat = { id: number; label: string; fee: number; note: string | null; designations: string[] };
type Details = { title: string; gender: string; institution: string; specialty: string; whatsapp: string; cnic: string; address: string; city: string; province: string; country: string; qualification: string; employeeNo: string; pmdcNo: string };
type Item = { title: string; kind: "WORKSHOP"; fee: number; left: number | null; when: string; tag: string | null };
const METHODS = [
  { k: "card", I: CreditCard, t: "Cards", s: "Visa · Mastercard" },
  { k: "wallet", I: Smartphone, t: "Wallets", s: "JazzCash · EasyPaisa" },
  { k: "bank", I: Landmark, t: "Bank account", s: "Internet banking" },
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
  const [det, setDet] = useState<Details>({ ...account, cnic: (account.country || "Pakistan") === "Pakistan" ? account.cnic.replace(/\D/g, "").slice(0, 13) : account.cnic });
  const [agree, setAgree] = useState(false);
  const [wsTerms, setWsTerms] = useState(false);
  // Workshop-only buyers without a pass still give a designation: it prints on the receipt and certificate
  const [wsDesignation, setWsDesignation] = useState("");
  const { submit, loading, error, fields } = useSubmit<{ accessToken: string; regNo: string }>("/api/checkout");
  const setD = (k: keyof Details) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDet((p) => {
      // issues sheet 16 Nov 2026: changing the country switches CNIC / passport and the WhatsApp country code with it
      if (k === "country") {
        const c = e.target.value, wa = splitPhone(p.whatsapp);
        return { ...p, country: c, cnic: (c === "Pakistan") !== ((p.country || "Pakistan") === "Pakistan") ? "" : p.cnic, province: c === "Pakistan" ? p.province : "",
          whatsapp: wa.num.replace(/\D/g, "") ? p.whatsapp : joinPhone(DIAL[c] ?? "92", "") };
      }
      return { ...p, [k]: k === "cnic" && (p.country || "Pakistan") === "Pakistan" ? e.target.value.replace(/\D/g, "").slice(0, 13) : e.target.value };
    });
  const detailsOk = !!det.title && !!det.gender && det.institution.trim().length >= 2 && (!det.cnic.trim() || (det.country || "Pakistan") !== "Pakistan" || /^\d{13}$/.test(det.cnic)) && det.address.trim().length >= 5 && det.city.trim().length >= 2;
  const fe = (k: string) => fields[k] || fields[`details.${k}`];

  const lines = cart.map((c) => ({ id: c.id, cartTitle: c.title, live: catalog[c.id] }));
  const valid = lines.filter((l) => l.live && l.live.left !== 0);
  const invalid = lines.filter((l) => !l.live || l.live.left === 0);
  const passCat = pass ? categories.find((c) => c.id === pass.categoryId && c.designations.includes(pass.designation)) ?? null : null;
  // a held registration made without a designation (e.g. by the desk, or before it was asked) asks for it here (fix 16 Nov 2026)
  const heldCat = held ? categories.find((c) => c.id === held.categoryId) ?? null : null;
  const heldOk = !!held?.designation && (!heldCat || heldCat.designations.includes(held.designation));
  const pickList = heldCat?.designations.length ? heldCat.designations : categories.flatMap((c) => c.designations);
  const designation = pass ? pass.designation : heldOk ? held!.designation! : wsDesignation;
  const categoryId = pass ? passCat?.id ?? null : held ? held.categoryId : categories.find((c) => c.designations.includes(wsDesignation))?.id ?? null;
  const passFee = passCat ? passCat.fee : 0;
  const extra = pass ? Math.min(banquet.max, pass.extraBanquet) : 0;
  const banquetTotal = extra * banquet.fee;
  const subtotal = passFee + banquetTotal + valid.reduce((a, l) => a + l.live!.fee, 0);
  const proc = processingFee(subtotal, processingPct);
  const total = subtotal + proc;
  const empty = !pass && lines.length === 0;
  const canPay = ready && !empty && !!categoryId && !!designation && (!pass || !!passCat) && detailsOk && agree && (valid.length === 0 || wsTerms) && invalid.length === 0;

  // 18 Nov 2026: what is still missing, shown prominently under the button and highlighted at the field once the person tries to pay
  const cnicBad = !!det.cnic.trim() && (det.country || "Pakistan") === "Pakistan" && !/^\d{13}$/.test(det.cnic);
  const missing: [string, string][] = ([
    [!designation, "designation", "Choose your designation"], [!det.title, "title", "Choose your title"], [!det.gender, "gender", "Choose your gender"],
    [det.institution.trim().length < 2, "institution", "Enter your hospital / institution"], [cnicBad, "cnic", "Enter the CNIC as 13 digits, or leave it empty"],
    [det.address.trim().length < 5, "address", "Enter your address"], [det.city.trim().length < 2, "city", "Enter your city"],
    [invalid.length > 0, "invalid", "Remove the unavailable workshop(s)"], [valid.length > 0 && !wsTerms, "wsTerms", "Accept the workshop terms"],
    [!agree, "agree", "Tick the confirmation box"],
  ] as [boolean, string, string][]).filter(([m]) => m).map(([, k, t]) => [k, t]);
  const [tried, setTried] = useState(false);
  const miss = (k: string) => tried && missing.some(([m]) => m === k);
  const Need = ({ k }: { k: string }) => (miss(k) ? <span className="err">{missing.find(([m]) => m === k)![1]}</span> : null);
  const tryPay = () => {
    if (canPay) return void pay();
    setTried(true);
    requestAnimationFrame(() => { const el = document.querySelector('[data-miss="1"]') as HTMLElement | null; el?.scrollIntoView({ behavior: "smooth", block: "center" }); (el?.querySelector("input, select, button") as HTMLElement | null)?.focus({ preventScroll: true }); });
  };
  const mark = (k: string) => ({ "data-miss": miss(k) ? "1" : undefined, className: miss(k) ? "field-invalid" : undefined });

  async function pay() {
    const r = await submit({ categoryId, designation, sessionIds: valid.map((l) => l.id), includePass: !!pass, banquetQty: extra, paymentMethod: "PayPro", details: { ...det, whatsapp: splitPhone(det.whatsapp).num.replace(/\D/g, "") ? det.whatsapp : "", cnic: (det.country || "Pakistan") === "Pakistan" ? maskCnic(det.cnic) : det.cnic } });
    if (r) { clear(); router.push(`/register/success/${r.accessToken}?checkout=1`); }
  }

  if (ready && empty) return (
    <div className="hud mt-10 p-10 text-center">
      <p className="font-display text-xl font-bold text-white">Your order is empty</p>
      <p className="mt-2 text-sm text-slate-300">{held ? `You hold a Symposium Registration (${held.regNo}). Add a workshop to continue.` : "Register for the Symposium or add pre-symposium workshops first."}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        {!held && <Link href="/register#pass" className="btn-primary">Register for the Symposium</Link>}
        <Link href="/register#workshops" className="btn-ghost">Explore Workshops</Link>
      </div>
    </div>
  );

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-12">
      {welcome && ready && (
        <div role="status" className="rounded-2xl border border-emerald-400/40 bg-emerald-400/10 px-5 py-3 text-sm text-emerald-100 lg:col-span-12">
          Signed in. {[pass ? "Your Symposium Registration" : null, cart.length ? `${cart.length} workshop registration${cart.length === 1 ? "" : "s"}` : null].filter(Boolean).join(" and ")} {pass && cart.length ? "are" : "is"} still selected.
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
                  <span className="flex-1 text-slate-200"><b className="text-white">Symposium Registration</b> · already yours ({held.regNo}). Not charged again.</span>
                  <span className="text-sm font-bold text-white">{pkr(0)}</span>
                </li>
              )}
              {pass && (
                <li className={cn("rounded-2xl border p-3", passCat ? "border-lnh-sky/40 bg-lnh-sky/[0.08]" : "border-lnh-red/40 bg-lnh-red/10")}>
                  <div className="flex items-start gap-3">
                    <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-lnh-sky" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">Symposium Registration · {pass.designation}</p>
                      <p className="text-xs text-slate-300">{passCat ? `All sessions, all 3 days · 1 banquet pass included${early ? " · early-bird price" : ""}` : "This designation is no longer offered. Choose your registration again."}</p>
                    </div>
                    <p className="text-sm font-bold text-white">{passCat ? pkr(passFee) : "—"}</p>
                    <button onClick={() => setPass(null)} aria-label="Remove Symposium Registration" className="grid h-9 w-9 place-items-center rounded-full text-slate-300 hover:text-lnh-rose"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {extra > 0 && <p className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-xs text-slate-300"><span className="flex items-center gap-1.5"><Utensils className="h-3.5 w-3.5" />Extra banquet pass × {extra}</span><b className="text-white">{pkr(banquetTotal)}</b></p>}
                </li>
              )}
              {lines.map((l) => (
                <li key={l.id} className={cn("flex items-start gap-3 rounded-2xl border p-3", l.live && l.live.left !== 0 ? "border-lnh-gold/30 bg-lnh-gold/[0.06]" : "border-lnh-red/40 bg-lnh-red/10")}>
                  <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-lnh-gold" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{l.live?.title ?? l.cartTitle}</p>
                    <p className="text-xs text-slate-300">{l.live ? `Workshop registration · ${l.live.when}${l.live.tag ? ` · ${l.live.tag}` : ""}` : "No longer available"}{l.live?.left === 0 && " · Fully booked"}</p>
                  </div>
                  <p className="text-sm font-bold text-white">{l.live ? pkr(l.live.fee) : "—"}</p>
                  <button onClick={() => remove(l.id)} aria-label={`Remove ${l.cartTitle}`} className="grid h-9 w-9 place-items-center rounded-full text-slate-300 hover:text-lnh-rose"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          {invalid.length > 0 && <Alert className="mt-4 flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />Remove the highlighted workshop(s) to continue: they are full or no longer offered.</Alert>}
          {!pass && (!held || !heldOk) && lines.length > 0 && (
            <div className="mt-5 rounded-2xl border border-white/15 p-4">
              <label className="block"><span className="label">Your designation <span className="text-lnh-red">*</span></span>
                <select {...mark("designation")} className={cn("input", miss("designation") && "!border-rose-500")} value={wsDesignation} onChange={(e) => setWsDesignation(e.target.value)}>
                  <option value="">Choose…</option>
                  {pickList.map((d) => <option key={d} value={d}>{d}</option>)}
                </select></label>
              {held ? <p className="mt-2 text-xs text-slate-300">Your designation is not recorded on {held.regNo}. Choose it once: it prints on your receipts and certificates.</p> : <p className="mt-2 text-xs text-slate-300">Pre-symposium workshops only: no Symposium Registration is included. Your designation prints on your receipt and certificate. <Link href="/register#pass" className="text-lnh-sky underline">Add Symposium Registration</Link></p>}
              {fe("designation") && <p className="err">{fe("designation")}</p>}
            </div>
          )}
        </div>

        {/* registration form details */}
        <div className="hud p-6">
          <p className="eyebrow">Registration form details</p>
          <p className="mt-2 text-xs text-slate-400">As on the LNH symposium registration form. Saved to your account for next time.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* 18 Nov 2026: the title (prefix) printed on the certificate can be corrected here (it was "Dr." for everyone by default) */}
            <label {...mark("title")} className={cn("block", miss("title") && "field-invalid")}><span className="label">Title <span className="text-lnh-red">*</span></span><select className="input" value={det.title} onChange={setD("title")}><option value="">Choose…</option>{TITLES.map((t) => <option key={t}>{t}</option>)}</select>{fe("title") ? <span className="err">{fe("title")}</span> : <Need k="title" />}</label>
            <div {...mark("gender")} className={cn("block", miss("gender") && "rounded-xl ring-2 ring-rose-500/60")}><span className="label">Gender <span className="text-lnh-red">*</span></span>
              <div className="flex gap-2" role="radiogroup" aria-label="Gender">{["Male", "Female"].map((g) => (
                <button key={g} type="button" role="radio" aria-checked={det.gender === g} onClick={() => setDet((p) => ({ ...p, gender: g }))}
                  className={cn("min-h-[44px] flex-1 rounded-xl border px-4 text-sm transition", det.gender === g ? "border-lnh-sky bg-lnh-sky/10 font-semibold text-white" : "border-white/15 text-slate-200 hover:border-white/40")}>{g}</button>))}
              </div>{fe("gender") ? <span className="err">{fe("gender")}</span> : <Need k="gender" />}</div>
            <label {...mark("institution")} className={cn("block", miss("institution") && "field-invalid")}><span className="label">Hospital / institution <span className="text-lnh-red">*</span></span><input className="input" value={det.institution} onChange={setD("institution")} autoComplete="organization" />{fe("institution") ? <span className="err">{fe("institution")}</span> : <Need k="institution" />}</label>
            <label className="block"><span className="label">Specialty</span><input className="input" list="specialties" value={det.specialty} onChange={setD("specialty")} /><datalist id="specialties">{SPECIALTIES.map((x) => <option key={x} value={x} />)}</datalist></label>
            <label className="block"><span className="label">Country</span><select className="input" value={det.country || "Pakistan"} onChange={setD("country")}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label {...mark("cnic")} className={cn("block", miss("cnic") && "field-invalid")}><span className="label">{(det.country || "Pakistan") === "Pakistan" ? "CNIC (13 digits, no dashes, optional)" : "Passport no. (optional)"}</span><input className="input mono" inputMode={(det.country || "Pakistan") === "Pakistan" ? "numeric" : "text"} placeholder={(det.country || "Pakistan") === "Pakistan" ? "4210112345671" : ""} value={det.cnic} onChange={setD("cnic")} />{fe("cnic") && <span className="err">{fe("cnic")}</span>}</label>
            <label {...mark("address")} className={cn("block sm:col-span-2", miss("address") && "field-invalid")}><span className="label">Address <span className="text-lnh-red">*</span></span><input className="input" value={det.address} onChange={setD("address")} autoComplete="street-address" />{fe("address") ? <span className="err">{fe("address")}</span> : <Need k="address" />}</label>
            <label className="block"><span className="label">Province</span>{(det.country || "Pakistan") === "Pakistan" ? <select className="input" value={det.province} onChange={setD("province")}><option value="">Choose…</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select> : <input className="input" value={det.province} onChange={setD("province")} />}</label>
            <label {...mark("city")} className={cn("block", miss("city") && "field-invalid")}><span className="label">City <span className="text-lnh-red">*</span></span><input className="input" value={det.city} onChange={setD("city")} />{fe("city") ? <span className="err">{fe("city")}</span> : <Need k="city" />}</label>
            <label className="block"><span className="label">WhatsApp no.</span><PhoneInput value={det.whatsapp} onChange={(v) => setDet((p) => ({ ...p, whatsapp: v }))} invalid={!!fe("whatsapp")} />{fe("whatsapp") && <span className="err">{fe("whatsapp")}</span>}</label>
            <label className="block"><span className="label">PMDC no. (medical doctors only)</span><input className="input" value={det.pmdcNo} onChange={setD("pmdcNo")} /></label>
            <label className="block"><span className="label">Highest academic qualification</span><input className="input" value={det.qualification} onChange={setD("qualification")} placeholder="e.g. MBBS, FCPS" /></label>
            <label className="block"><span className="label">Emp # / Student ID (only for LNH)</span><input className="input mono" value={det.employeeNo} onChange={setD("employeeNo")} /></label>
          </div>
        </div>

        {/* workshop terms: Final LNH Workshop Registration 2027 form */}
        {valid.length > 0 && (
          <div className="hud p-6">
            <p className="eyebrow">Workshop registration · dear participants</p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-200">
              <li>Please use same email address for registration of &quot;Symposium&quot; and &quot;Workshops&quot;.</li>
              <li>Please ensure that all information provided is accurate, as it will be used for issuing the certificate.</li>
              <li>Registration fees is non-refundable and non-transferable.</li>
              <li>Registration will be considered complete only after the payment proof is received.</li>
              <li>Please bring record of your registration confirmation email and keep it with you all the time during the workshop.</li>
              <li>If you encounter any issues while submitting the form, please do not hesitate to reach out to <a href="mailto:workshop@symposium2027.lnh.edu.pk" className="text-lnh-sky underline">workshop@symposium2027.lnh.edu.pk</a></li>
            </ol>
            <label {...mark("wsTerms")} className={cn("mt-4 flex cursor-pointer gap-3 rounded-lg text-sm text-slate-200", miss("wsTerms") && "p-2 ring-2 ring-rose-500/60")}><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#B72025]" checked={wsTerms} onChange={(e) => setWsTerms(e.target.checked)} />I accept the terms listed above.</label>
          </div>
        )}

        {/* payment */}
        <div className="hud p-6">
          {/* 16 Nov 2026: one PayPro panel; the method is chosen on PayPro's own page */}
          <p className="eyebrow">Payment</p>
          <div className="mt-4 rounded-2xl border border-lnh-sky/40 bg-lnh-sky/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-white"><Lock className="h-4 w-4 text-lnh-sky" />Pay securely with PayPro</p>
            <p className="mt-1 text-xs text-slate-300">Accepted on the PayPro page:</p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-200">
              {METHODS.map(({ k, I, t, s }) => <span key={k} className="flex items-center gap-1.5"><I className="h-4 w-4 text-lnh-sky" /><b className="font-semibold">{t}</b><span className="text-slate-400">{s}</span></span>)}
            </div>
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
            {pass && passCat && <div className="flex justify-between gap-3"><span className="text-slate-300">Symposium Registration · {pass.designation}{early ? " (early bird)" : ""}</span><span className="shrink-0 whitespace-nowrap text-white">{pkr(passFee)}</span></div>}
            {extra > 0 && <div className="flex justify-between gap-3"><span className="text-slate-300">Extra banquet pass × {extra}</span><span className="shrink-0 whitespace-nowrap text-white">{pkr(banquetTotal)}</span></div>}
            {valid.map((l) => <div key={l.id} className="flex justify-between gap-3"><span className="text-slate-300">Workshop: {l.live!.title}</span><span className="shrink-0 whitespace-nowrap text-white">{pkr(l.live!.fee)}</span></div>)}
            <div className="flex justify-between border-t border-white/10 pt-3"><span className="text-slate-300">Subtotal</span><span className="text-white">{pkr(subtotal)}</span></div>
            {proc > 0 && <div className="flex justify-between"><span className="text-slate-300">Payment processing{processingPct ? ` (${processingPct}%)` : ""}</span><span className="text-white">{pkr(proc)}</span></div>}
            <div className="flex items-baseline justify-between border-t border-white/10 pt-4"><span className="font-semibold uppercase tracking-wider text-white">Total</span><span className="font-display text-3xl font-bold text-lnh-rose">{pkr(total)}</span></div>
            <p className="mono pt-2 text-xs text-slate-400">{held ? `This order is added to your registration ${held.regNo}.` : "A registration number (SYM-YYYY-NNNNN) is issued when you confirm."}</p>
            {error && <Alert className="mt-3">{error}</Alert>}
            <label {...mark("agree")} className={cn("mt-3 flex cursor-pointer gap-3 rounded-lg text-xs text-slate-200", miss("agree") && "p-2 ring-2 ring-rose-500/60")}><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#B72025]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />I confirm that the above information provided is correct.</label>
            <button onClick={tryPay} disabled={!ready || empty || loading} aria-describedby={!canPay ? "pay-missing" : undefined} className={cn("btn-primary mt-4 w-full py-4", !canPay && "opacity-60")}><Lock className="h-4 w-4" />{loading ? "Creating registration…" : `Confirm and pay ${pkr(total)}`}</button>
            {ready && !canPay && missing.length > 0 && (
              <div id="pay-missing" role="status" className="mt-3 rounded-xl border-2 border-amber-400/70 bg-amber-400/10 px-4 py-3 text-sm text-white">
                <p className="font-semibold">To complete your registration:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">{missing.map(([k, t]) => <li key={k}>{t}</li>)}</ul>
                {!tried && <p className="mt-1 text-xs opacity-80">Press the button to see the fields that need attention.</p>}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
