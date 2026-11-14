"use client";
import { useEffect, useState } from "react";
import { Download, Radio, Star } from "lucide-react";
import { cn } from "@/lib/utils";

/* D6 (LNH answers 13 Nov 2026): selected features from the ISC dashboard — My itinerary, Happening now, CSV export.
 * The itinerary is kept in this browser only (no sign-in needed). CME filter is hidden until the CME process is confirmed. */
export type AgendaItem = { id: string; title: string; type: string; hall: string | null; start: string; end: string; day: number; href: string };
const KEY = "lnh-itinerary";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
const write = (ids: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage blocked */ } window.dispatchEvent(new Event("itinerary")); };
function useSaved() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => { const f = () => setIds(read()); f(); window.addEventListener("itinerary", f); window.addEventListener("storage", f); return () => { window.removeEventListener("itinerary", f); window.removeEventListener("storage", f); }; }, []);
  return ids;
}
const pkTime = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Karachi" });
const pkDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
const csvCell = (v: string) => { const s = /^[=+\-@]/.test(v) ? `'${v}` : v; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function AgendaTools({ items, csvHref }: { items: AgendaItem[]; csvHref: string }) {
  const saved = useSaved();
  const [only, setOnly] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);
  useEffect(() => { document.documentElement.toggleAttribute("data-itin-only", only); return () => document.documentElement.removeAttribute("data-itin-only"); }, [only]);
  const live = now ? items.filter((i) => +new Date(i.start) <= now && now < +new Date(i.end)) : [];
  const mine = items.filter((i) => saved.includes(i.id)).sort((a, b) => a.start.localeCompare(b.start));
  const downloadMine = () => {
    const rows = [["Date", "Start", "End", "Session", "Type", "Hall"], ...mine.map((i) => [pkDate(i.start), pkTime(i.start), pkTime(i.end), i.title, i.type, i.hall ?? ""])];
    const blob = new Blob(["﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "my-lnh-itinerary.csv"; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <div className="mb-8 space-y-4">
      {live.length > 0 && (
        <div className="hud p-4" aria-live="polite">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300"><Radio className="h-4 w-4 animate-pulse" />Happening now</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">{live.map((i) => (
            <li key={i.id}><a href={i.href} className="block rounded-xl border border-white/10 px-3 py-2 hover:border-lnh-sky"><span className="font-semibold text-white">{i.title}</span><span className="block text-xs text-slate-300">{i.hall} · until {pkTime(i.end)}</span></a></li>
          ))}</ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOnly((x) => !x)} aria-pressed={only} className={cn("inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-4 text-sm", only ? "border-lnh-gold bg-lnh-gold/15 font-semibold text-white" : "border-white/15 text-slate-300 hover:border-white/40")}>
          <Star className={cn("h-4 w-4", only && "fill-current text-lnh-gold")} />My itinerary ({mine.length})</button>
        {only && mine.length > 0 && <button type="button" onClick={downloadMine} className="btn-ghost btn-sm"><Download className="h-4 w-4" />My itinerary (CSV)</button>}
        <a href={csvHref} className="btn-ghost btn-sm"><Download className="h-4 w-4" />Agenda (CSV)</a>
        {only && !mine.length && <p className="text-sm text-slate-300">Tap “Add to my itinerary” under any session to build your own schedule.</p>}
      </div>
    </div>
  );
}

/** Wraps a session card: the itinerary button, and hidden when “My itinerary” is on and this session is not saved. */
export function ItineraryItem({ id, children }: { id: string; children: React.ReactNode }) {
  const saved = useSaved().includes(id);
  return (
    <div className="itin-item grid grid-rows-[1fr_auto]" data-saved={saved ? "" : undefined}>
      {children}
      <button type="button" onClick={() => { const ids = read(); write(saved ? ids.filter((x) => x !== id) : [...ids, id]); }} aria-pressed={saved}
        className={cn("mt-1.5 inline-flex min-h-[36px] items-center gap-1.5 text-xs", saved ? "font-semibold text-lnh-gold" : "text-slate-400 hover:text-white")}>
        <Star className={cn("h-3.5 w-3.5", saved && "fill-current")} />{saved ? "In my itinerary" : "Add to my itinerary"}</button>
    </div>
  );
}
