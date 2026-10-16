"use client";
import { Award, CalendarDays, Clock, MapPin, Users } from "lucide-react";
import type { WorkshopDTO } from "@/lib/workshops";
import { AddToCart, RegisterNow } from "@/components/cart/CartDrawer";
import { cn, pkr } from "@/lib/utils";

const DEPT_HUES = ["text-lnh-sky border-lnh-sky/40 bg-lnh-sky/10", "text-lnh-rose border-lnh-red/40 bg-lnh-red/10", "text-lnh-gold border-lnh-gold/40 bg-lnh-gold/10", "text-violet-300 border-violet-400/40 bg-violet-400/10", "text-emerald-300 border-emerald-400/40 bg-emerald-400/10"];
export const deptHue = (d?: string | null) => DEPT_HUES[[...(d || "x")].reduce((a, c) => a + c.charCodeAt(0), 0) % DEPT_HUES.length];

export function WorkshopCard({ w, compact }: { w: WorkshopDTO; compact?: boolean }) {
  const full = w.left === 0;
  const pct = w.capacity ? Math.min(100, ((w.capacity - (w.left ?? 0)) / w.capacity) * 100) : 0;
  const item = { id: w.id, title: w.title, kind: "WORKSHOP" as const, fee: w.fee, when: w.dateLabel, tag: w.department };
  const lead = w.faculty[0];
  return (
    <article className="hud group relative flex h-full flex-col overflow-hidden p-5 transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(63,184,240,0.45)] sm:p-6">
      <span className="corner left-3 top-3 border-l border-t" /><span className="corner right-3 top-3 border-r border-t" />
      <div className="flex flex-wrap items-center gap-2">
        {w.department && <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest", deptHue(w.department))}>{w.department}</span>}
        {w.format && <span className="chip">{w.format}</span>}
      </div>
      <h3 className="mt-4 font-display text-lg font-bold leading-snug text-white sm:text-xl">{w.title}</h3>
      {!compact && w.description && <p className="mt-2 line-clamp-2 text-sm text-slate-400">{w.description}</p>}
      {lead && (
        <p className="mt-3 text-sm text-slate-300">
          <span className="text-slate-500">Lead faculty: </span><span className="font-semibold text-white">{lead.name}</span>
          {lead.degrees && <span className="text-slate-400">, {lead.degrees}</span>}
          {w.faculty.length > 1 && <span className="text-slate-500"> +{w.faculty.length - 1} faculty</span>}
        </p>
      )}
      <ul className="mono mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px] text-slate-300">
        <li className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-lnh-sky" />{w.dateLabel}</li>
        <li className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-lnh-sky" />{w.timeLabel}</li>
        <li className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-lnh-sky" />{w.hall}</li>
        {w.cme != null && <li className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-lnh-gold" />{w.cme} CME hours</li>}
      </ul>
      {w.capacity != null && (
        <div className="mt-4">
          <div className="flex justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-400"><Users className="h-3.5 w-3.5" />Seats</span>
            <span className={cn("mono font-semibold", full ? "text-lnh-rose" : (w.left ?? 0) <= 5 ? "text-lnh-gold" : "text-emerald-300")}>{full ? "Fully booked" : `${w.left} of ${w.capacity} seats left`}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-lnh-sky via-lnh-blue to-lnh-red transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Fee</p>
          <p className="font-display text-lg font-bold text-white">{pkr(w.fee)}{w.regularFee > w.fee && <span className="ml-2 text-xs font-normal text-slate-500 line-through">{pkr(w.regularFee)}</span>}</p>
        </div>
        <div className="flex items-center gap-2">
          <AddToCart item={item} disabled={full} />
          {!compact && <RegisterNow item={item} disabled={full} />}
        </div>
      </div>
    </article>
  );
}
