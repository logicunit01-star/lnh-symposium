"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { AlertTriangle, Building2, CheckCircle2, MapPin, Monitor, Users, X } from "lucide-react";
import { submitWorkshop, type FormResult } from "@/app/admin/workshops/actions";
import { CampusMap } from "@/components/CampusMap";

type V = { id: string; name: string; building: string; floor: string | null; capacity: number; onlineFacility: string | null; equipment: string | null; mapX: number; mapY: number; directions: string | null };
export type WorkshopInitial = {
  id?: string; title?: string; category?: string | null; department?: string | null; contributors?: string | null; format?: string | null;
  date?: string; start?: string; end?: string; venueId?: string | null; capacity?: number | null; fee?: number; earlyFee?: number | null; cmeHours?: number | null;
  description?: string | null; leadFaculty?: string | null; facultyDegrees?: string | null; facultyContact?: string | null; facultyProfile?: string | null;
  facilitators?: number; volunteers?: number; technicians?: number; equipment?: { item: string; qty: number; source: string }[];
  // Workshop Decisions and New Requirements (13 Nov 2026)
  days?: number; proposedTitle?: string | null; organiser?: string | null; objectives?: string | null; targetAudience?: string | null; prelimProgramme?: string | null;
  mode?: string; onlineLink?: string | null; facilitatorNames?: string[];
};
const MODES = [["ONSITE", "Onsite"], ["ONLINE", "Online"], ["HYBRID", "Hybrid (onsite + online)"]] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const FORMATS = ["Hands-on", "Simulation", "Lecture", "Drill", "Panel", "Online"];

const DURATIONS = Array.from({ length: 15 }, (_, i) => 60 + i * 30); // 1 h to 8 h in 30-minute steps
// D1 (13 Nov): besides 1-8 hours, 2 or 3 consecutive full days (09:00-17:00 each). Stored as negative numbers in the select.
const durLabel = (m: number) => m < 0 ? `${-m} full days (09:00–17:00 each day)` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
const addDays = (d: string, n: number) => new Date(new Date(`${d}T12:00:00Z`).getTime() + n * 864e5).toISOString().slice(0, 10);
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const toHM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const isSun = (d: string) => !!d && new Date(`${d}T12:00:00Z`).getUTCDay() === 0;
const longDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
type Avail = { clash: { title: string; from: string; to: string; status: string } | null; otherVenues: { id: string; name: string; building: string; capacity: number }[]; otherDates: string[] };

function Submit({ edit, blocked }: { edit: boolean; blocked?: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending || blocked} className="a-btn-red">{pending ? "Saving…" : edit ? "Save changes" : "Submit for review"}</button>;
}

export function WorkshopForm({ venues, weeks, window, fixedDepartment, departments, init = {}, committee = false }: {
  venues: V[]; weeks: { from: string; label: string }[]; window: { from: string; to: string; today?: string }; fixedDepartment: string | null; departments: string[]; init?: WorkshopInitial;
  committee?: boolean; // D3: the committee or Super Admin is editing (also after the decision)
}) {
  const [mode, setMode] = useState(init.mode ?? "ONSITE");
  const online = mode === "ONLINE";
  const [contrib, setContrib] = useState<string[]>(() => (init.contributors ?? "").split(",").map((x) => x.trim()).filter(Boolean));
  const ddRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => { // the departments drop-down closes on a click outside it
    const f = (e: MouseEvent) => { if (ddRef.current?.open && !ddRef.current.contains(e.target as Node)) ddRef.current.open = false; };
    document.addEventListener("click", f); return () => document.removeEventListener("click", f);
  }, []);
  const [state, action] = useFormState<FormResult, FormData>(submitWorkshop, null);
  const [venueId, setVenueId] = useState(init.venueId ?? "");
  const firstDay = (() => { const m = [window.today ?? "", window.from].filter(Boolean).sort().at(-1) ?? ""; if (!m) return ""; let d = new Date(`${m}T12:00:00Z`); if (d.getUTCDay() === 0) d = new Date(d.getTime() + 864e5); return d.toISOString().slice(0, 10); })();
  const [date, setDate] = useState(init.date ?? firstDay);
  const [cap, setCap] = useState<number>(init.capacity ?? 30);
  const v = venues.find((x) => x.id === venueId);
  // Schedule rules (Dashboard Findings, 9 Nov): no past dates, no Sundays, hours follow the workshop duration,
  // and the room check runs as soon as the date, time or room changes (first come, first served).
  const today = window.today ?? "";
  const minDate = [today, window.from].filter(Boolean).sort().at(-1) ?? "";
  const [start, setStart] = useState(init.start ?? "09:00");
  const [dur, setDur] = useState(() => { if ((init.days ?? 1) > 1) return -(init.days ?? 1); const d = init.start && init.end ? toMin(init.end) - toMin(init.start) : 240; return DURATIONS.includes(d) ? d : Math.max(30, d); });
  const days = dur < 0 ? -dur : 1;
  const durs = [...(DURATIONS.includes(dur) || dur < 0 ? DURATIONS : [...DURATIONS, dur].sort((a, b) => a - b)), -2, -3];
  const startOpts = useMemo(() => Array.from({ length: 24 * 12 }, (_, i) => i * 5).filter((m) => m + Math.max(dur, 0) <= 24 * 60 && m >= 6 * 60).map(toHM), [dur]);
  const end = days > 1 ? "17:00" : toHM(Math.min(24 * 60 - 5, toMin(start) + dur));
  const lastDay = date ? addDays(date, days - 1) : "";
  const keepsDate = !!init.id && date === init.date;
  const dateErr = !date ? "" : !keepsDate && minDate && date < minDate ? (date < today ? "This date has passed. Choose a date from today onwards." : "Choose a date inside the workshop window.") : !keepsDate && isSun(date) ? "Sundays are not available. Choose another day."
    : days > 1 && Array.from({ length: days - 1 }, (_, i) => addDays(date, i + 1)).some(isSun) ? `A ${days}-day workshop cannot include a Sunday. Choose another start date.`
    : days > 1 && window.to && lastDay > window.to ? `The last day (${longDate(lastDay)}) falls after the workshop window.` : "";
  const [avail, setAvail] = useState<Avail | null>(null);
  const [checking, setChecking] = useState(false);
  const [showAlt, setShowAlt] = useState(false);
  useEffect(() => {
    if (!date || dateErr || !venueId || online) { setAvail(null); return; }
    const ctl = new AbortController();
    setChecking(true);
    const t = setTimeout(() => {
      const q = new URLSearchParams({ date, start: days > 1 ? "09:00" : start, end, venueId, seats: String(cap || 1), days: String(days), ...(init.id ? { exclude: init.id } : {}) });
      fetch(`/api/admin/workshops/availability?${q}`, { signal: ctl.signal }).then((r) => r.ok ? r.json() : null).then((j: Avail | null) => {
        setAvail(j); setChecking(false); if (j?.clash) setShowAlt(true);
      }).catch(() => setChecking(false));
    }, 250);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [date, start, end, venueId, cap, dateErr, init.id, days, online]);
  const blocked = !!dateErr || (!online && !!avail?.clash);
  const week = useMemo(() => { let w = 0; weeks.forEach((x, i) => { if (date >= x.from) w = i + 1; }); return w; }, [date, weeks]);
  const L = ({ children, hint }: { children: React.ReactNode; hint?: string }) => <label className="a-label">{children}{hint && <span className="ml-1 font-normal text-slate-400">{hint}</span>}</label>;

  return (
    <form action={action} className="space-y-6">
      {init.id && <input type="hidden" name="id" value={init.id} />}
      {state?.error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{state.error}</p>}

      <section className="a-card p-6">
        <h2 className="mb-4 font-display text-base font-bold text-slate-900">1 · Workshop</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><L hint={committee && init.id ? "(finalised title, set by the committee)" : init.id ? undefined : "(proposed title; the committee finalises it)"}>Workshop title</L><input name="title" required minLength={5} defaultValue={init.title ?? ""} className="a-input" placeholder="e.g. Critical Care Day: Ventilation and Bedside Ultrasound" />
            {init.proposedTitle && init.proposedTitle !== init.title && <p className="mt-1 text-xs text-slate-500">Proposed title: “{init.proposedTitle}”</p>}</div>
          <div><L>Organising person</L><input name="organiser" required defaultValue={init.organiser ?? ""} className="a-input" placeholder="Dr. Firstname Lastname, designation" /></div>
          <div><L>Workshop mode</L><select name="mode" value={mode} onChange={(e) => setMode(e.target.value)} className="a-input">{MODES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><L>Category</L>
            <select name="category" defaultValue={init.category ?? "A"} className="a-input"><option value="A">A · Multidisciplinary</option><option value="B">B · Departmental</option></select></div>
          <div><L>Format</L><select name="format" defaultValue={init.format ?? "Hands-on"} className="a-input">{FORMATS.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><L hint={fixedDepartment ? "(your department)" : undefined}>Owning department</L>
            {fixedDepartment ? <input value={fixedDepartment} readOnly className="a-input bg-slate-50" />
              : <select name="department" required defaultValue={init.department ?? ""} className="a-input"><option value="" disabled>Choose department…</option>{init.department && !departments.includes(init.department) && <option>{init.department}</option>}{departments.map((d) => <option key={d}>{d}</option>)}</select>}</div>
          <div><L hint="(multidisciplinary; optional)">Contributing departments</L>
            <input type="hidden" name="contributors" value={contrib.join(", ")} />
            <details ref={ddRef} className="a-input relative cursor-pointer p-0">
              <summary className="list-none px-3 py-2 text-sm">{contrib.length ? contrib.join(", ") : <span className="text-slate-400">Choose departments…</span>}</summary>
              <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                {departments.filter((d) => d !== (fixedDepartment ?? init.department)).map((d) => (
                  <label key={d} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                    <input type="checkbox" checked={contrib.includes(d)} onChange={(e) => setContrib((c) => e.target.checked ? [...c, d] : c.filter((x) => x !== d))} />{d}</label>
                ))}
              </div>
            </details></div>
          <div className="sm:col-span-2"><L>Workshop description</L><textarea name="description" rows={3} maxLength={1200} defaultValue={init.description ?? ""} className="a-input" placeholder="What participants will practise and take away (max 1,200 characters)." /></div>
          <div className="sm:col-span-2"><L>Educational objectives</L><textarea name="objectives" rows={3} maxLength={1500} required defaultValue={init.objectives ?? ""} className="a-input" placeholder={"By the end of the workshop participants will be able to…\n1. …\n2. …"} /></div>
          <div className="sm:col-span-2"><L>Target audience</L><input name="targetAudience" required maxLength={300} defaultValue={init.targetAudience ?? ""} className="a-input" placeholder="e.g. Residents, nurses and allied health staff in critical care" /></div>
          <div className="sm:col-span-2"><L hint="(time, topic, facilitator; one line each)">Preliminary programme</L><textarea name="prelimProgramme" rows={4} maxLength={3000} defaultValue={init.prelimProgramme ?? ""} className="a-input font-mono text-xs" placeholder={"09:00 Registration and pre-test\n09:30 Airway assessment, Dr. A\n10:30 Hands-on stations"} /></div>
        </div>
      </section>

      <section className="a-card p-6">
        <h2 className="mb-4 font-display text-base font-bold text-slate-900">2 · Schedule and venue</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><L hint="(Monday to Saturday)">Proposed date</L><input type="date" name="date" required min={keepsDate ? undefined : minDate || undefined} max={window.to || undefined} value={date} onChange={(e) => setDate(e.target.value)} className={`a-input ${dateErr ? "border-rose-400" : ""}`} aria-invalid={!!dateErr} aria-describedby="date-help" />
            <p id="date-help" className={`mt-1 text-xs ${dateErr ? "font-semibold text-rose-600" : "text-slate-500"}`}>{dateErr || (week ? <>Theme week {week} · {weeks[week - 1]?.label}</> : "Outside the theme weeks")}</p></div>
          <div><L>Duration</L>
            <select name="duration" value={dur} onChange={(e) => { const d = Number(e.target.value); setDur(d); if (d < 0) setStart("09:00"); else if (toMin(start) + d > 24 * 60) setStart(toHM(24 * 60 - d)); }} className="a-input">{durs.map((d) => <option key={d} value={d}>{durLabel(d)}</option>)}</select>
            <input type="hidden" name="days" value={days} />
            {days > 1 && date && !dateErr && <p className="mt-1 text-xs text-slate-500">{longDate(date)} to {longDate(lastDay)}</p>}</div>
          <div><L hint="(24-hour)">Start and end</L>
            <div className="flex items-center gap-2">
              <select value={days > 1 ? "09:00" : start} disabled={days > 1} onChange={(e) => setStart(e.target.value)} className="a-input w-28 font-mono" aria-label="Start time">{startOpts.includes(start) ? null : <option>{start}</option>}{startOpts.map((x) => <option key={x}>{x}</option>)}</select>
              <span className="text-slate-400">to</span><span className="font-mono font-semibold text-slate-800" aria-live="polite">{end}</span>
            </div>
            <input type="hidden" name="startH" value={days > 1 ? "09" : start.slice(0, 2)} /><input type="hidden" name="startM" value={days > 1 ? "00" : start.slice(3, 5)} />
            <input type="hidden" name="endH" value={end.slice(0, 2)} /><input type="hidden" name="endM" value={end.slice(3, 5)} />
            <p className="mt-1 text-xs text-slate-500">{days > 1 ? "Each day runs 09:00 to 17:00." : "The end time follows the duration."}</p></div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            {mode !== "ONSITE" && <div><L hint={online ? "(no room needed)" : "(in addition to the room)"}>Online link</L><input name="onlineLink" type="url" defaultValue={init.onlineLink ?? ""} className="a-input" placeholder="https://zoom.us/j/… (can be added later)" /></div>}
            {!online && <><div><L>Venue</L>
              <select name="venueId" required value={venueId} onChange={(e) => { setVenueId(e.target.value); const nv = venues.find((x) => x.id === e.target.value); if (nv && cap > nv.capacity) setCap(nv.capacity); }} className="a-input">
                <option value="">Choose a room…</option>
                {venues.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.building} (seats {x.capacity})</option>)}
              </select>
              {venueId && !dateErr && (
                <div className="mt-2 text-sm" aria-live="polite">
                  {checking ? <p className="text-slate-500">Checking the room…</p>
                    : avail?.clash ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">
                        <AlertTriangle className="h-4 w-4 shrink-0" /><span><b>{v?.name}</b> is already booked {avail.clash.from}–{avail.clash.to} on {longDate(date)} for “{avail.clash.title}”{avail.clash.status === "APPROVED" ? "" : " (awaiting approval)"}.</span>
                        <button type="button" onClick={() => setShowAlt(true)} className="ml-auto text-xs font-semibold underline">See free rooms and dates</button>
                      </div>)
                    : avail ? <p className="flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-4 w-4" />{v?.name} is free on {longDate(date)}, {start}–{end}.</p> : null}
                </div>
              )}</div>
            {v ? (
              <div className="grid gap-3 rounded-xl border border-lnh-blue/20 bg-lnh-blue/[0.04] p-4 text-sm sm:grid-cols-3" aria-live="polite">
                <div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Users className="h-3.5 w-3.5" />Seating capacity</p><p className="mt-1 font-display text-xl font-bold text-slate-900">{v.capacity}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-200"><div className={`h-full rounded-full ${cap > v.capacity ? "bg-lnh-red" : "bg-lnh-blue"}`} style={{ width: `${Math.min(100, (cap / v.capacity) * 100)}%` }} /></div>
                  <p className="mt-1 text-xs text-slate-500">Your cap uses {Math.round((cap / v.capacity) * 100)}%</p></div>
                <div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Monitor className="h-3.5 w-3.5" />Online facility</p><p className="mt-1 font-medium text-slate-800">{v.onlineFacility ?? "None"}</p>{v.equipment && <p className="mt-1 text-xs text-slate-500">{v.equipment}</p>}</div>
                <div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Building2 className="h-3.5 w-3.5" />Location</p><p className="mt-1 font-medium text-slate-800">{v.building}{v.floor ? `, ${v.floor} floor` : ""}</p>{v.directions && <p className="mt-1 text-xs text-slate-500">{v.directions}</p>}</div>
              </div>
            ) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-400">Choose a room to see its capacity, online facility and location.</p>}</>}
            <div className="grid gap-4 sm:grid-cols-4">
              <div><L>Seat cap</L><input type="number" name="capacity" min={1} max={online ? undefined : v?.capacity} required value={cap} onChange={(e) => setCap(Number(e.target.value))} className="a-input" /></div>
              <div><L>Fee (PKR)</L><input type="number" name="fee" min={0} step={100} defaultValue={init.fee ?? 2000} className="a-input" /></div>
              
              <div><L>CME hours</L><select name="cmeHours" defaultValue={String(init.cmeHours ?? 3)} className="a-input">{[1, 2, 3, 3.5, 4, 5, 6, 7, 8].map((x) => <option key={x} value={x}>{x}</option>)}</select></div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-2">
            <CampusMap pins={venues} active={venueId} className="h-auto w-full rounded-lg" />
            <p className="flex items-center gap-1 px-1 pt-1 text-[11px] text-slate-500"><MapPin className="h-3 w-3" />Schematic campus map, not to scale</p>
          </div>
        </div>
      </section>

      <section className="a-card p-6">
        <h2 className="mb-4 font-display text-base font-bold text-slate-900">3 · Workshop Director and facilitators</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><L hint="(leads the workshop)">Workshop Director</L><input name="leadFaculty" required defaultValue={init.leadFaculty ?? ""} className="a-input" placeholder="Dr. Firstname Lastname" /></div>
          <div><L>Degrees</L><input name="facultyDegrees" defaultValue={init.facultyDegrees ?? ""} className="a-input" placeholder="MBBS, FCPS" /></div>
          <div><L>Speaker contact no.</L><input name="facultyContact" inputMode="tel" pattern="(\+92|0)3\d{2}-?\d{7}" defaultValue={init.facultyContact ?? ""} className="a-input" placeholder="0300-1234567" /></div>
          <div className="sm:col-span-3"><L>Education and experience</L><textarea name="facultyProfile" rows={4} maxLength={2000} defaultValue={init.facultyProfile ?? ""} className="a-input" placeholder={"Qualifications, current post, years of experience, previous workshops taught."} /></div>
          <div className="sm:col-span-3"><L hint="(one name per line; shown on the e-flyer, no photos)">Facilitators</L><textarea name="facilitatorNames" rows={4} defaultValue={(init.facilitatorNames ?? []).join("\n")} className="a-input" placeholder={"Dr. Firstname Lastname, MBBS, FCPS\nMs. Firstname Lastname, RN"} /></div>
        </div>
      </section>

      <section className="a-card p-6">
        <h2 className="mb-4 font-display text-base font-bold text-slate-900">4 · People and equipment</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><L>Volunteers</L><input type="number" name="volunteers" min={0} defaultValue={init.volunteers ?? 1} className="a-input" /></div>
          <div><L>Technicians</L><input type="number" name="technicians" min={0} defaultValue={init.technicians ?? 0} className="a-input" /></div>
          <div className="sm:col-span-3"><L hint="(one per line: item, quantity, source)">Equipment and consumables</L>
            <textarea name="equipment" rows={4} defaultValue={(init.equipment ?? []).map((e) => `${e.item}, ${e.qty}, ${e.source}`).join("\n")} className="a-input font-mono text-xs" placeholder={"Airway manikin, 4, Skill Lab\nUltrasound machine, 2, Radiology"} />
            <p className="mt-1 text-xs text-slate-500">Source: Skill Lab, department, purchase or sponsor loan. These lines feed the daily requirements sheet.</p></div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Submit edit={!!init.id} blocked={blocked} />
        {blocked && <p className="text-xs font-semibold text-rose-600">{dateErr || "Choose a free room, time or date to continue."}</p>}
        <p className="text-xs text-slate-500">After approval the same record produces the catalogue card, the flyer and the daily requirements sheet, and is locked.</p>
      </div>

      {showAlt && avail?.clash && (
        <div role="dialog" aria-modal="true" aria-labelledby="alt-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onKeyDown={(e) => e.key === "Escape" && setShowAlt(false)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div><h3 id="alt-title" className="font-display text-lg font-bold text-slate-900">{v?.name} is not available</h3>
                <p className="mt-1 text-sm text-slate-600">Booked {avail.clash.from}–{avail.clash.to} on {longDate(date)} for “{avail.clash.title}”. Pick another room at the same time, or another date for this room.</p></div>
              <button type="button" onClick={() => setShowAlt(false)} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">{v?.name} is free {start}–{end} on</p>
            {avail.otherDates.length ? <div className="mt-2 flex flex-wrap gap-2">{avail.otherDates.map((d) => (
              <button key={d} type="button" onClick={() => { setDate(d); setShowAlt(false); }} className="a-btn-ghost py-1 text-xs">{longDate(d)}</button>
            ))}</div> : <p className="mt-2 text-sm text-slate-500">No other free date in the workshop window at this time.</p>}
            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Free rooms on {longDate(date)}, {start}–{end}</p>
            {avail.otherVenues.length ? <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">{avail.otherVenues.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm"><span><b>{o.name}</b><span className="block text-xs text-slate-500">{o.building} · {o.capacity} seats</span></span>
                <button type="button" onClick={() => { setVenueId(o.id); if (cap > o.capacity) setCap(o.capacity); setShowAlt(false); }} className="a-btn-ghost py-1 text-xs">Use this room</button></li>
            ))}</ul> : <p className="mt-2 text-sm text-slate-500">No other room with {cap} seats is free at this time.</p>}
            <p className="mt-5 text-xs text-slate-500">Rooms are booked first come, first served, including requests awaiting approval.</p>
          </div>
        </div>
      )}
    </form>
  );
}
