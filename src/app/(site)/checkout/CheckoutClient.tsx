"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CreditCard, Landmark, Lock, ShieldCheck, Smartphone, Ticket, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useSubmit } from "@/components/ui/useForm";
import { Alert } from "@/components/ui/Field";
import { cn, pkr, processingFee } from "@/lib/utils";

type Cat = { id: number; label: string; fee: number; note: string | null };
type Item = { title: string; kind: "WORKSHOP" | "SESSION"; fee: number; left: number | null; when: string; tag: string | null };
const METHODS = [
  { k: "card", I: CreditCard, t: "Credit / debit card", s: "Visa · Mastercard" },
  { k: "wallet", I: Smartphone, t: "Mobile wallet", s: "JazzCash · EasyPaisa" },
  { k: "bank", I: Landmark, t: "Bank transfer", s: "Internet banking" },
];

export function CheckoutClient({ catalog, categories, processingPct, early }: { catalog: Record<string, Item>; categories: Cat[]; processingPct: number; early: boolean }) {
  const router = useRouter();
  const { items: cart, remove, clear, ready } = useCart();
  const [cat, setCat] = useState<number | null>(null);
  const [pass, setPass] = useState(true);
  const [method, setMethod] = useState("card");
  const [agree, setAgree] = useState(false);
  const { submit, loading, error } = useSubmit<{ accessToken: string; regNo: string }>("/api/checkout");

  const lines = cart.map((c) => ({ id: c.id, cartTitle: c.title, live: catalog[c.id] }));
  const valid = lines.filter((l) => l.live && l.live.left !== 0);
  const invalid = lines.filter((l) => !l.live || l.live.left === 0);
  const category = categories.find((c) => c.id === cat);
  const passFee = pass && category ? category.fee : 0;
  const subtotal = passFee + valid.reduce((a, l) => a + l.live!.fee, 0);
  const proc = processingFee(subtotal, processingPct);
  const total = subtotal + proc;
  const canPay = ready && !!category && (pass || valid.length > 0) && agree && invalid.length === 0;

  async function pay() {
    const r = await submit({ categoryId: cat, sessionIds: valid.map((l) => l.id), includePass: pass, paymentMethod: method });
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
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="h-4 w-4 accent-[#D2192E]" checked={pass} onChange={(e) => setPass(e.target.checked)} />Include symposium pass</label>
          </div>
          <p className="mt-2 text-xs text-slate-500">{pass ? "Covers keynotes, panels and ceremonies on all symposium days." : "Workshops only — category is still needed for your receipt and certificate."}{early ? " Early-bird rates applied." : ""}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {categories.map((c) => (
              <label key={c.id} className={cn("flex cursor-pointer items-start justify-between gap-3 rounded-2xl border p-4 transition", cat === c.id ? "border-lnh-red bg-lnh-red/10" : "border-white/10 hover:border-white/30")}>
                <input type="radio" name="cat" className="sr-only" checked={cat === c.id} onChange={() => setCat(c.id)} />
                <span><span className="block text-sm font-semibold text-white">{c.label}</span>{c.note && <span className="text-[11px] text-slate-400">{c.note}</span>}</span>
                <span className="shrink-0 font-display font-bold text-white">{pass ? pkr(c.fee) : "—"}</span>
              </label>
            ))}
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
            {pass && <div className="flex justify-between gap-3"><span className="flex items-center gap-2 text-slate-300"><Ticket className="h-4 w-4 text-lnh-red" />Symposium pass{category ? ` — ${category.label}` : ""}</span><span className="shrink-0 whitespace-nowrap text-white">{category ? pkr(category.fee) : "Select category"}</span></div>}
            {valid.map((l) => <div key={l.id} className="flex justify-between gap-3"><span className="text-slate-300">{l.live!.kind === "WORKSHOP" ? "Workshop" : "Session"}: {l.live!.title}</span><span className="shrink-0 whitespace-nowrap text-white">{l.live!.fee ? pkr(l.live!.fee) : "Included"}</span></div>)}
            <div className="flex justify-between border-t border-white/10 pt-3"><span className="text-slate-400">Subtotal</span><span className="text-white">{pkr(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Tax &amp; processing{processingPct ? ` (${processingPct}%)` : ""}</span><span className="text-white">{pkr(proc)}</span></div>
            <div className="flex items-baseline justify-between border-t border-white/10 pt-4"><span className="font-semibold uppercase tracking-wider text-white">Total</span><span className="font-display text-3xl font-bold text-lnh-rose">{pkr(total)}</span></div>
            <p className="mono pt-2 text-[11px] text-slate-500">A unique Registration ID (SYM-YYYY-NNNNN) is issued when you confirm.</p>
            {error && <Alert className="mt-3">{error}</Alert>}
            <label className="mt-3 flex cursor-pointer gap-3 text-xs text-slate-300"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#D2192E]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />I confirm my details are correct and accept the registration and refund terms.</label>
            <button onClick={pay} disabled={!canPay || loading} className="btn-primary mt-4 w-full py-4"><Lock className="h-4 w-4" />{loading ? "Creating registration…" : `Complete registration & pay ${pkr(total)}`}</button>
            {!category && <p className="text-center text-[11px] text-slate-500">Select your category to continue.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
