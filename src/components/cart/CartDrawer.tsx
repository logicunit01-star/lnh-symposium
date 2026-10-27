"use client";
import Link from "next/link";
import { useEffect } from "react";
import { Lock, ShoppingCart, Trash2, X } from "lucide-react";
import { useCart } from "./CartProvider";
import { cn, pkr } from "@/lib/utils";

export function CartButton({ className, bare = false }: { className?: string; bare?: boolean }) {
  const { count, setOpen } = useCart();
  return (
    <button onClick={() => setOpen(true)} className={cn("relative grid place-items-center rounded-full transition", bare ? "h-9 w-9 text-slate-300 hover:bg-white/10 hover:text-white" : "h-10 w-10 border border-white/15 text-white hover:border-lnh-sky hover:bg-white/5", className)} aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
      <ShoppingCart className="h-[18px] w-[18px]" />
      {count > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-lnh-red px-1 text-[10px] font-bold text-white shadow-[0_0_12px_#D2192E]">{count}</span>}
    </button>
  );
}

export function CartSummary({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { items, total, remove, clear, ready } = useCart();
  if (!ready) return <div className="h-24 animate-pulse rounded-2xl bg-white/5" />;
  if (!items.length) return (
    <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">
      Your cart is empty. Tick <b className="text-white">Add to cart</b> on any workshop or session.
    </div>
  );
  return (
    <div>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.id} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", i.kind === "WORKSHOP" ? "bg-lnh-gold" : "bg-lnh-sky")} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-white">{i.title}</p>
              <p className="text-[11px] text-slate-400">{i.kind === "WORKSHOP" ? "Workshop" : "Scientific session"}{i.tag ? ` · ${i.tag}` : ""} · {i.when}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">{i.fee ? pkr(i.fee) : "Included"}</p>
              <button onClick={() => remove(i.id)} className="mt-1 text-slate-500 transition hover:text-lnh-rose" aria-label={`Remove ${i.title}`}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </li>
        ))}
      </ul>
      <button onClick={clear} className="mt-3 w-full rounded-xl border border-lnh-red/30 bg-lnh-red/10 py-2 text-xs font-semibold text-lnh-rose transition hover:bg-lnh-red/20">Clear cart</button>
      <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-4">
        <span className="text-sm text-slate-300">Selected items</span>
        <span className="font-display text-2xl font-bold text-white">{pkr(total)}</span>
      </div>
      {!compact && <p className="mt-1 text-[11px] text-slate-500">Symposium pass (if chosen) is added at checkout.</p>}
      <Link href="/checkout" onClick={onNavigate} className="btn-primary mt-4 w-full"><Lock className="h-4 w-4" />Proceed to checkout</Link>
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
      <aside role="dialog" aria-label="Your registration cart" className={cn("absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-white/10 bg-ink-800/95 shadow-2xl backdrop-blur-xl transition-transform duration-500", open ? "translate-x-0" : "translate-x-full")}>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div><p className="eyebrow">Your registration cart</p><p className="mt-1 font-display text-xl font-bold text-white">{count} item{count === 1 ? "" : "s"} selected</p></div>
          <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white" aria-label="Close cart"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6"><CartSummary onNavigate={() => setOpen(false)} /></div>
      </aside>
    </div>
  );
}

/** Checkbox control used on cards. */
export function AddToCart({ item, disabled, label = "Add to cart" }: { item: import("./CartProvider").CartItem; disabled?: boolean; label?: string }) {
  const { has, toggle, ready } = useCart();
  const on = ready && has(item.id);
  return (
    <label className={cn("inline-flex cursor-pointer select-none items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
      disabled && !on ? "cursor-not-allowed border-white/10 text-slate-500" : on ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300" : "border-white/15 text-slate-200 hover:border-lnh-sky")}>
      <input type="checkbox" className="h-4 w-4 accent-[#3FB8F0]" checked={on} disabled={disabled && !on} onChange={() => toggle(item)} />
      {on ? "In cart" : label}
    </label>
  );
}
export function RegisterNow({ item, disabled }: { item: import("./CartProvider").CartItem; disabled?: boolean }) {
  const { add, setOpen } = useCart();
  return <button disabled={disabled} onClick={() => { add(item); setOpen(true); }} className="btn-primary btn-sm">Register</button>;
}
