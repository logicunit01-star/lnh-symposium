"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Minus, Plus, Ticket, Utensils, Wrench } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { cn, pkr } from "@/lib/utils";

export type Tier = { id: number; code: string; designations: string[]; fee: number; regular: number };

/** The two products, side by side (registration redesign, release 1). */
export function ProductCards({ fromFee, early }: { fromFee: number; early: boolean }) {
  const { held } = useCart();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <a href="#pass" className="group rounded-3xl border-2 border-lnh-sky/60 bg-lnh-sky/[0.08] p-6 transition hover:bg-lnh-sky/[0.14]">
        <Ticket className="h-7 w-7 text-lnh-sky" />
        <p className="mt-3 font-display text-2xl font-bold text-white">Symposium Registration</p>
        {held ? (
          <p className="mt-2 text-sm text-slate-200">Yours: <b className="text-white">{held.regNo}</b> · {held.status === "PENDING" ? "payment pending" : "confirmed"}</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            <li>Access all sessions across the three symposium days.</li>
            <li>Includes one banquet entry</li>
            <li>{early ? "Early-bird registration starting from" : "Registration starting from"} <b className="text-white">{pkr(fromFee)}</b></li>
          </ul>
        )}
        <span className="mt-4 inline-flex min-h-[44px] items-center rounded-full border border-lnh-sky/60 px-4 text-sm font-semibold text-white group-hover:bg-lnh-sky/20">{held ? "View your registration" : "Register for the Symposium"}</span>
      </a>
      <a href="/workshops" className="group rounded-3xl border-2 border-lnh-gold/60 bg-lnh-gold/[0.07] p-6 transition hover:bg-lnh-gold/[0.13]">
        <Wrench className="h-7 w-7 text-lnh-gold" />
        <p className="mt-3 font-display text-2xl font-bold text-white">Pre-Symposium Workshops</p>
        <p className="mt-2 text-sm text-slate-200">Enhance your learning through specialised pre-symposium workshops.</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-200">
          <li>Register separately for each workshop</li>
          <li>Limited seats available</li>
          <li>No symposium registration required</li>
          <li>Each workshop has a separate registration fee</li>
        </ul>
        <span className="mt-4 inline-flex min-h-[44px] items-center rounded-full border border-lnh-gold/60 px-4 text-sm font-semibold text-white group-hover:bg-lnh-gold/20">Explore Workshops</span>
      </a>
    </div>
  );
}

/** Step 1: tier, designation and extra banquet passes. Choosing a designation adds the pass to the order. */
export function PassStep({ tiers, early, earlyUntil, banquet, open }: { tiers: Tier[]; early: boolean; earlyUntil: string | null; banquet: { fee: number; max: number }; open: boolean }) {
  const { pass, setPass, setExtraBanquet, held, ready } = useCart();
  const [tierId, setTierId] = useState<number | null>(null);
  useEffect(() => { if (ready && pass) setTierId(pass.categoryId); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  if (held) {
    return (
      <div className="hud p-6">
        <p className="flex items-center gap-2 font-semibold text-white"><Check className="h-5 w-5 text-emerald-400" />You already hold a Symposium Registration ({held.regNo}).</p>
        <p className="mt-1 text-sm text-slate-300">{held.status === "PENDING" ? "Its payment is pending. " : ""}It covers every session, so there is nothing more to add here. Add Pre-Symposium Workshops below if you like.</p>
        <Link href={`/register/success/${held.accessToken}`} className="btn-ghost btn-sm mt-4">{held.status === "PENDING" ? "Complete your payment" : "View your registration"}</Link>
      </div>
    );
  }
  const sel = tiers.find((t) => t.id === tierId) ?? null;
  const choose = (t: Tier, designation: string) =>
    setPass({ categoryId: t.id, tier: tierName(t), designation, fee: t.fee, early, extraBanquet: pass?.extraBanquet ?? 0, banquetFee: banquet.fee });
  const pickTier = (t: Tier) => {
    setTierId(t.id);
    if (t.designations.length === 1) choose(t, t.designations[0]);
    else if (pass && pass.categoryId !== t.id) setPass(null);
  };
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-300">Select your registration category and designation. {early && earlyUntil ? `Early-bird fee applies until ${earlyUntil}.` : ""} Your designation determines the registration fee and will appear on your certificate.</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="Pass tier">
        {tiers.map((t) => {
          const on = sel?.id === t.id;
          return (
            <button key={t.id} type="button" role="radio" aria-checked={on} disabled={!open}
              onClick={() => pickTier(t)}
              className={cn("flex h-full flex-col items-start justify-start rounded-2xl border p-4 text-left transition disabled:opacity-50", on ? "border-2 border-lnh-sky bg-lnh-sky/10" : "border-white/15 hover:border-white/40")}>
              <p className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">{tierName(t)}</p>
              <p className="mt-1 font-display text-2xl font-bold text-white">{pkr(t.fee)}</p>
              {early && t.regular > t.fee && <p className="text-xs text-slate-400"><span className="line-through">{pkr(t.regular)}</span> after early bird</p>}
              <p className="mt-2 text-xs leading-relaxed text-slate-300">{t.designations.join(", ")}</p>
            </button>
          );
        })}
      </div>
      {sel && (
        <div className="hud p-5">
          <p className="label">Your designation</p>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Designation">
            {sel.designations.map((d) => (
              <button key={d} type="button" role="radio" aria-checked={pass?.designation === d} onClick={() => choose(sel, d)}
                className={cn("min-h-[44px] rounded-full border px-4 text-sm transition", pass?.designation === d ? "border-lnh-sky bg-lnh-sky/15 font-semibold text-white" : "border-white/20 text-slate-200 hover:border-white/50")}>{d}</button>
            ))}
          </div>
          {ready && !pass && <p className="mt-2 text-xs text-lnh-gold">Choose your designation to add the pass to your order.</p>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-white"><Utensils className="h-4 w-4 text-lnh-sky" />Banquet: 1 pass included</p>
              <p className="text-xs text-slate-300">Add up to {banquet.max} extra banquet passes at {pkr(banquet.fee)} each, if you wish.</p>
            </div>
            <div className="flex items-center gap-2" aria-label="Extra banquet passes">
              <button type="button" disabled={!pass || pass.extraBanquet <= 0} onClick={() => setExtraBanquet(Math.max(0, (pass?.extraBanquet ?? 0) - 1))} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white disabled:opacity-30" aria-label="One fewer extra banquet pass"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center font-display text-xl font-bold text-white" aria-live="polite">{pass?.extraBanquet ?? 0}</span>
              <button type="button" disabled={!pass || (pass?.extraBanquet ?? 0) >= banquet.max} onClick={() => setExtraBanquet(Math.min(banquet.max, (pass?.extraBanquet ?? 0) + 1))} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white disabled:opacity-30" aria-label="One more extra banquet pass"><Plus className="h-4 w-4" /></button>
            </div>
          </div>
          {pass && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm">
              <span className="flex items-center gap-2 text-emerald-200"><Check className="h-4 w-4" />Symposium Registration added: {pass.designation}, {pkr(pass.fee)}{pass.extraBanquet ? ` + ${pass.extraBanquet} extra banquet` : ""}</span>
              <button type="button" onClick={() => setPass(null)} className="min-h-[44px] px-2 text-sm text-slate-200 underline">Remove pass</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const tierName = (t: Tier) => (/^T\d$/.test(t.code) ? `Tier ${t.code.slice(1)}` : t.code);
