"use client";
import { useState } from "react";
import { MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type GuideVenue = {
  key: string; name: string; short: string; x: number; y: number; info: string;
  rooms: { name: string; capacity: number }[];
  sessions: Record<string, { title: string; time: string; room: string; dept: string | null }[]>;
};

const BLOCKS: { x: number; y: number; w: number; h: number; label: string; key?: string }[] = [
  { x: 34, y: 12, w: 30, h: 32, label: "Convention Centre", key: "Convention Center" },
  { x: 8, y: 30, w: 24, h: 30, label: "LNMC", key: "LNMC" },
  { x: 56, y: 8, w: 14, h: 16, label: "Surgical Tower" },
  { x: 64, y: 44, w: 22, h: 14, label: "Clinical Skills Centre" },
  { x: 18, y: 64, w: 26, h: 14, label: "Nursing College", key: "College of Nursing" },
  { x: 74, y: 10, w: 20, h: 24, label: "Main Hospital · Radiology", key: "Radiology" },
  { x: 47, y: 52, w: 14, h: 14, label: "BSMT", key: "BSMT" },
];

/** Static guide map of the 5 scientific session venues (SC feedback, 29 Oct 2026): a pin per venue; tap a pin for venue details and that day's sessions. */
export function VenueGuide({ venues, days, released }: { venues: GuideVenue[]; days: { key: string; label: string }[]; released: boolean }) {
  const [sel, setSel] = useState(venues[0]?.key ?? "");
  const [day, setDay] = useState(days[0]?.key ?? "");
  const v = venues.find((x) => x.key === sel);
  const list = v?.sessions[day] ?? [];
  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <div className="hud p-3">
        <svg viewBox="0 0 100 86" className="w-full rounded-xl" role="img" aria-label="Guide map of the scientific session venues on the LNH campus">
          <rect width="100" height="86" fill="#071331" />
          <rect x="0" y="80" width="100" height="6" fill="rgba(255,255,255,0.08)" />
          <rect x="32" y="46" width="3" height="34" fill="rgba(255,255,255,0.06)" /><rect x="4" y="46" width="92" height="3" fill="rgba(255,255,255,0.06)" />
          <text x="50" y="84" textAnchor="middle" fontSize="2.4" fill="#9fb3d9" letterSpacing="0.4">STADIUM ROAD · MAIN GATE ▲</text>
          {BLOCKS.map((b) => {
            const on = b.key === sel;
            return (
              <g key={b.label}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="1.6" fill={on ? "rgba(0,184,215,0.22)" : b.key ? "rgba(0,137,191,0.16)" : "rgba(255,255,255,0.04)"} stroke={on ? "#00B8D7" : b.key ? "rgba(0,184,215,0.5)" : "rgba(255,255,255,0.12)"} strokeWidth={on ? 0.6 : 0.3} />
                <text x={b.x + 1.5} y={b.y + 3.4} fontSize="2.1" fill={b.key ? "#cfe6f5" : "#6b7c9e"} fontWeight="600">{b.label}</text>
              </g>
            );
          })}
          {venues.map((p, i) => {
            const on = p.key === sel;
            return (
              <g key={p.key} transform={`translate(${p.x} ${p.y})`} onClick={() => setSel(p.key)} style={{ cursor: "pointer" }} role="button" tabIndex={0} aria-label={`${p.name}: show details`}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSel(p.key)}>
                <title>{p.name}</title>
                {on && <circle r="4.6" fill="#B72025" opacity="0.2" />}
                <path d="M0 0 C -2.8 -3.4 -2.8 -6.4 0 -6.4 C 2.8 -6.4 2.8 -3.4 0 0 Z" fill={on ? "#B72025" : "#00B8D7"} stroke="#fff" strokeWidth="0.4" />
                <text y="-3.7" textAnchor="middle" fontSize="2.2" fontWeight="700" fill="#fff">{i + 1}</text>
              </g>
            );
          })}
        </svg>
        <p className="mono px-2 pt-2 text-[11px] text-slate-500">Guide map, not to scale · tap a numbered pin for venue details</p>
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">{venues.map((p, i) => (
          <button key={p.key} onClick={() => setSel(p.key)} className={cn("rounded-full border px-3 py-1.5 text-xs", sel === p.key ? "border-lnh-red bg-lnh-red/15 text-white" : "border-white/10 text-slate-300 hover:border-white/30")}>{i + 1} · {p.short}</button>
        ))}</div>
        {v && (
          <div className="card p-5">
            <p className="flex items-center gap-2 font-display text-xl font-bold text-white"><MapPin className="h-5 w-5 text-lnh-red" />{v.name}</p>
            <p className="mt-1 text-sm text-slate-400">{v.info}</p>
            <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">{v.rooms.map((r) => <li key={r.name} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-slate-200"><span>{r.name}</span><span className="mono flex items-center gap-1 text-[11px] text-slate-400"><Users className="h-3 w-3" />{r.capacity}</span></li>)}</ul>
            <div className="mt-5 flex flex-wrap gap-2">{days.map((d) => (
              <button key={d.key} onClick={() => setDay(d.key)} className={cn("rounded-full px-4 py-1.5 text-xs font-semibold", day === d.key ? "bg-lnh-blue text-white" : "bg-white/5 text-slate-300")}>{d.label}</button>
            ))}</div>
            {!released ? <p className="mt-4 text-sm text-slate-400">Session allocation for this venue is shown here once the scientific programme is released.</p>
              : list.length ? (
                <ul className="mt-4 divide-y divide-white/10 text-sm">{list.map((s, i) => (
                  <li key={i} className="py-2"><span className="mono text-xs text-lnh-sky">{s.time}</span> <span className="text-white">{s.title}</span><span className="block text-xs text-slate-400">{s.room}{s.dept ? ` · ${s.dept}` : ""}</span></li>
                ))}</ul>
              ) : <p className="mt-4 text-sm text-slate-400">No scientific sessions at this venue on this day.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
