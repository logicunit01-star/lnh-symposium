"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Check, ChevronUp, Lock, Plus, Ticket, Trash2, Utensils, Wrench, X } from "lucide-react";
import { useCart, type CartItem } from "./CartProvider";
import { cn, pkr } from "@/lib/utils";

/** Order summary: Symposium Pass first, then workshop tickets, then extra banquet passes and the total (registration redesign, release 1). */
export function OrderSummary({ onNavigate, showCta = true }: { onNavigate?: () => void; showCta?: boolean }) {
  const { items, pass, held, total, procPct, remove, setPass, clear, ready } = useCart();
  if (!ready) return <div className="h-24 animate-pulse rounded-2xl bg-white/5" />;
  const empty = !items.length && !pass;
  return (
    <div>
      {held && (
        <div className="mb-3 rounded-2xl border border-lnh-sky/40 bg-lnh-sky/10 p-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-white"><Ticket className="h-4 w-4 text-lnh-sky" />Your Symposium Pass</p>
          <p className="mt-0.5 text-xs text-slate-300">{held.regNo} · {held.status === "PENDING" ? "payment pending" : "confirmed"}. Add workshop tickets below; the pass is not charged again.</p>
        </div>
      )}
      {empty ? (
        <div className="rounded-2xl border border-dashed border-white/20 p-5 text-center text-sm text-slate-300">
          Nothing selected yet.{held ? " Add a workshop ticket to continue." : " Choose your Symposium Pass or add workshop tickets."}
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {!held && <Link href="/register#pass" onClick={onNavigate} className="btn-ghost btn-sm">Choose pass</Link>}
            <Link href="/register#workshops" onClick={onNavigate} className="btn-ghost btn-sm">Browse workshops</Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-2">
          {pass && (
            <li className="rounded-2xl border border-lnh-sky/40 bg-lnh-sky/[0.08] p-3">
              <div className="flex items-start gap-3">
                <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-lnh-sky" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-white">Symposium Pass</p>
                  <p className="text-xs text-slate-300">{pass.designation} · {pass.tier}{pass.early ? " · early bird" : ""}</p>
                  <p className="text-xs text-slate-300">All sessions, all 3 days · 1 banquet pass included</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{pkr(pass.fee)}</p>
                  <button onClick={() => setPass(null)} className="mt-1 inline-grid h-8 w-8 place-items-center rounded-full text-slate-300 hover:bg-white/10 hover:text-lnh-rose" aria-label="Remove Symposium Pass"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {pass.extraBanquet > 0 && (
                <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-xs text-slate-300">
                  <span className="flex items-center gap-1.5"><Utensils className="h-3.5 w-3.5" />Extra banquet pass × {pass.extraBanquet}</span>
                  <span className="font-semibold text-white">{pkr(pass.extraBanquet * pass.banquetFee)}</span>
                </div>
              )}
            </li>
          )}
          {items.map((i) => (
            <li key={i.id} className="flex items-start gap-3 rounded-2xl border border-lnh-gold/30 bg-lnh-gold/[0.06] p-3">
              <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-lnh-gold" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug text-white">{i.title}</p>
                <p className="text-xs text-slate-300">Workshop ticket · {i.when}{i.tag ? ` · ${i.tag}` : ""}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{pkr(i.fee)}</p>
                <button onClick={() => remove(i.id)} className="mt-1 inline-grid h-8 w-8 place-items-center rounded-full text-slate-300 hover:bg-white/10 hover:text-lnh-rose" aria-label={`Remove ${i.title}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!empty && (
        <>
          <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-4">
            <span className="text-sm text-slate-300">Total</span>
            <span className="font-display text-2xl font-bold text-white">{pkr(total)}</span>
          </div>
          {procPct > 0 && <p className="mt-1 text-xs text-slate-400">Plus a {procPct}% payment processing fee, shown at checkout.</p>}
          {showCta && <Link href="/checkout" onClick={onNavigate} className="btn-primary mt-4 w-full"><Lock className="h-4 w-4" />Continue to checkout</Link>}
          <p className="mt-2 text-center text-xs text-slate-400">Sign in or create an account next. Your selection is kept.</p>
          <button onClick={clear} className="mt-3 w-full rounded-xl py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/5 hover:text-lnh-rose">Clear selection</button>
        </>
      )}
    </div>
  );
}

export function CartDrawer() {
  const { open, setOpen, count } = useCart();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [setOpen]);
  return (
    <div className={cn("fixed inset-0 z-[60] transition", open ? "visible" : "invisible")} aria-hidden={!open}>
      <div className={cn("absolute inset-0 bg-ink/70 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
      <aside role="dialog" aria-label="Your order" className={cn("absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/10 bg-ink-800/95 shadow-2xl backdrop-blur-xl transition-transform duration-500", open ? "translate-x-0" : "translate-x-full")}>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div><p className="eyebrow">Your order</p><p className="mt-1 font-display text-xl font-bold text-white">{count} item{count === 1 ? "" : "s"} selected</p></div>
          <button onClick={() => setOpen(false)} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6"><OrderSummary onNavigate={() => setOpen(false)} /></div>
      </aside>
    </div>
  );
}

/** Phones: bottom bar with the order count and total, on the register and workshop pages. */
export function OrderBar() {
  const { count, total, pass, items, setOpen, ready } = useCart();
  if (!ready || count === 0) return null;
  const what = [pass ? "Pass" : null, items.length ? `${items.length} workshop${items.length === 1 ? "" : "s"}` : null].filter(Boolean).join(" + ");
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-800/95 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen(true)} className="flex min-h-[44px] flex-1 items-center gap-2 text-left" aria-label="Review your order">
          <ChevronUp className="h-4 w-4 text-slate-300" />
          <span><span className="block text-xs text-slate-300">{what}</span><span className="block font-display text-lg font-bold text-white">{pkr(total)}</span></span>
        </button>
        <Link href="/checkout" className="btn-primary">Continue</Link>
      </div>
    </div>
  );
}

/** One button per workshop card: adds or removes the workshop ticket. */
export function AddTicket({ item, disabled, className }: { item: CartItem; disabled?: boolean; className?: string }) {
  const { has, toggle, ready } = useCart();
  const on = ready && has(item.id);
  return (
    <button type="button" aria-pressed={on} disabled={disabled && !on} onClick={() => toggle(item)}
      className={cn("inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        on ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300" : "border-lnh-gold/60 bg-lnh-gold/10 text-white hover:bg-lnh-gold/20", className)}>
      {on ? <><Check className="h-4 w-4" />Added</> : <><Plus className="h-4 w-4" />Add ticket</>}
    </button>
  );
}
