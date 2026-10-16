"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, ShoppingCart, X } from "lucide-react";
import type { WorkshopDTO } from "@/lib/workshops";
import { WorkshopCard } from "@/components/site/WorkshopCard";
import { CartSummary } from "@/components/cart/CartDrawer";
import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/lib/utils";

const DAY = 864e5;
const parse = (d: string) => new Date(`${d}T00:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const monday = (d: Date) => new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY);
const short = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function WorkshopCatalog({ items }: { items: WorkshopDTO[] }) {
  const { count, setOpen } = useCart();
  // Weeks (Mon–Sun) that contain at least one workshop
  const weeks = useMemo(() => {
    const starts = [...new Set(items.map((w) => iso(monday(parse(w.date)))))].sort();
    return starts.map((s, i) => { const a = parse(s), b = new Date(a.getTime() + 6 * DAY); return { key: s, label: `Week ${i + 1}`, range: `${short(a)} – ${short(b)}`, from: s, to: iso(b) }; });
  }, [items]);
  const departments = useMemo(() => [...new Set(items.map((w) => w.department).filter(Boolean))].sort() as string[], [items]);
  const formats = useMemo(() => [...new Set(items.map((w) => w.format).filter(Boolean))].sort() as string[], [items]);
  const months = useMemo(() => [...new Set(items.map((w) => w.date.slice(0, 7)))].sort(), [items]);

  const [week, setWeek] = useState<string>("all");
  const [day, setDay] = useState<string | null>(null);
  const [dept, setDept] = useState("");
  const [fmt, setFmt] = useState("");
  const [month, setMonth] = useState(months[0] ?? iso(new Date()).slice(0, 7));
  const [filtersOpen, setFiltersOpen] = useState(false);

  const wk = weeks.find((w) => w.key === week);
  const shown = items.filter((w) =>
    (!wk || (w.date >= wk.from && w.date <= wk.to)) && (!day || w.date === day) && (!dept || w.department === dept) && (!fmt || w.format === fmt));
  const datesWith = new Set(items.map((w) => w.date));
  const reset = () => { setWeek("all"); setDay(null); setDept(""); setFmt(""); };

  // calendar grid for selected month
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const gridStart = monday(first);
  const cells = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getTime() + i * DAY));
  const mi = months.indexOf(month);
  const selWeek = wk ? { a: wk.from, b: wk.to } : null;

  const calendar = (
    <div className="hud p-4">
      <div className="flex items-center justify-between">
        <button disabled={mi <= 0} onClick={() => setMonth(months[mi - 1])} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white disabled:opacity-30" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
        <p className="font-display text-sm font-bold text-white">{first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}</p>
        <button disabled={mi < 0 || mi >= months.length - 1} onClick={() => setMonth(months[mi + 1])} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white disabled:opacity-30" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="mono mt-3 grid grid-cols-7 gap-1 text-center text-[10px] uppercase text-slate-500">{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const k = iso(d), inMonth = d.getUTCMonth() === m - 1, has = datesWith.has(k), sel = day === k, inWeek = selWeek && k >= selWeek.a && k <= selWeek.b;
          return (
            <button key={k} disabled={!has} onClick={() => { setDay(sel ? null : k); setWeek("all"); }}
              className={cn("relative grid aspect-square place-items-center rounded-lg text-xs transition",
                !inMonth && "opacity-30", has ? "font-bold text-white hover:bg-lnh-blue/40" : "cursor-default text-slate-600",
                inWeek && "bg-lnh-blue/20", sel && "bg-lnh-red text-white shadow-[0_0_14px_-2px_#D2192E]")}>
              {d.getUTCDate()}
              {has && !sel && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-lnh-sky" />}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-slate-500">Dots mark days with workshops. Click a day to filter.</p>
    </div>
  );

  const selects = (
    <div className="grid gap-3">
      <label><span className="label">Department</span>
        <select className="input" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All departments</option>{departments.map((d) => <option key={d}>{d}</option>)}</select>
      </label>
      <label><span className="label">Format</span>
        <select className="input" value={fmt} onChange={(e) => setFmt(e.target.value)}><option value="">All formats</option>{formats.map((d) => <option key={d}>{d}</option>)}</select>
      </label>
    </div>
  );

  return (
    <div className="container-x">
      {/* week tabs */}
      <div role="tablist" className="sticky top-20 z-20 -mx-4 mb-6 flex gap-2 overflow-x-auto bg-ink/80 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-full sm:border sm:border-white/10 sm:p-2">
        {[{ key: "all", label: "All weeks", range: `${items.length} workshops` }, ...weeks].map((t) => (
          <button key={t.key} role="tab" aria-selected={week === t.key} onClick={() => { setWeek(t.key); setDay(null); if (t.key !== "all") setMonth(t.key.slice(0, 7)); }}
            className={cn("shrink-0 rounded-full px-5 py-2.5 text-left transition", week === t.key ? "bg-lnh-red text-white shadow-[0_8px_30px_-8px_#D2192E]" : "text-slate-300 hover:bg-white/5")}>
            <span className="block font-display text-sm font-bold">{t.label}</span>
            <span className={cn("mono block text-[10px]", week === t.key ? "text-white/80" : "text-slate-500")}>{t.range}</span>
          </button>
        ))}
        <button onClick={() => setFiltersOpen(true)} className="ml-auto flex shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 text-xs font-semibold text-white lg:hidden"><Filter className="h-4 w-4" />Filters</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr_340px]">
        {/* filters (desktop) */}
        <aside className="hidden space-y-4 self-start lg:sticky lg:top-40 lg:block">
          <p className="eyebrow">Filter by</p>
          {calendar}
          {selects}
          {(week !== "all" || day || dept || fmt) && <button onClick={reset} className="btn-ghost btn-sm w-full">Clear filters</button>}
        </aside>

        {/* grid */}
        <div>
          <p className="mono mb-4 text-xs uppercase tracking-[0.2em] text-slate-400">{shown.length} approved workshop{shown.length === 1 ? "" : "s"}{day ? ` on ${short(parse(day))}` : wk ? ` · ${wk.range}` : ""}</p>
          {shown.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">{shown.map((w) => <WorkshopCard key={w.id} w={w} />)}</div>
          ) : (
            <div className="hud p-10 text-center text-slate-400">No workshops match these filters. <button onClick={reset} className="text-lnh-sky underline">Clear filters</button></div>
          )}
        </div>

        {/* cart (desktop) */}
        <aside className="hidden self-start lg:sticky lg:top-40 lg:block">
          <div className="hud p-5">
            <p className="eyebrow mb-4">Your registration cart</p>
            <CartSummary compact />
            <p className="mt-4 text-[11px] text-slate-500">Multiple selection enabled. Only committee-approved workshops are listed.</p>
          </div>
        </aside>
      </div>

      {/* mobile: floating cart */}
      <button onClick={() => setOpen(true)} className="btn-primary fixed bottom-5 right-5 z-40 shadow-2xl lg:hidden"><ShoppingCart className="h-4 w-4" />Cart ({count})</button>

      {/* mobile filters sheet */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[55] lg:hidden">
          <div className="absolute inset-0 bg-ink/70 backdrop-blur-sm" onClick={() => setFiltersOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] space-y-4 overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-800 p-5">
            <div className="flex items-center justify-between"><p className="font-display text-lg font-bold text-white">Filters</p><button onClick={() => setFiltersOpen(false)} aria-label="Close"><X className="h-5 w-5 text-white" /></button></div>
            {calendar}{selects}
            <div className="flex gap-2"><button onClick={reset} className="btn-ghost flex-1">Clear</button><button onClick={() => setFiltersOpen(false)} className="btn-primary flex-1">Show {shown.length}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
