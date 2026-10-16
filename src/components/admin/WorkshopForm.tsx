"use client";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Building2, MapPin, Monitor, Users } from "lucide-react";
import { submitWorkshop, type FormResult } from "@/app/admin/workshops/actions";
import { CampusMap } from "@/components/CampusMap";

type V = { id: string; name: string; building: string; floor: string | null; capacity: number; onlineFacility: string | null; equipment: string | null; mapX: number; mapY: number; directions: string | null };
export type WorkshopInitial = {
  id?: string; title?: string; category?: string | null; department?: string | null; contributors?: string | null; format?: string | null;
  date?: string; start?: string; end?: string; venueId?: string | null; capacity?: number | null; fee?: number; earlyFee?: number | null; cmeHours?: number | null;
  description?: string | null; leadFaculty?: string | null; facultyDegrees?: string | null; facultyContact?: string | null; facultyProfile?: string | null;
  facilitators?: number; volunteers?: number; technicians?: number; equipment?: { item: string; qty: number; source: string }[];
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const FORMATS = ["Hands-on", "Simulation", "Lecture", "Drill", "Panel", "Online"];

function TimePick({ name, value }: { name: string; value: string }) {
  const [h, m] = value.split(":");
  return (
    <div className="flex items-center gap-1">
      <select name={`${name}H`} defaultValue={h} className="a-input w-20 font-mono" aria-label={`${name} hour`}>{HOURS.map((x) => <option key={x}>{x}</option>)}</select>
      <span className="font-mono text-slate-400">:</span>
      <select name={`${name}M`} defaultValue={MINS.includes(m) ? m : "00"} className="a-input w-20 font-mono" aria-label={`${name} minutes`}>{MINS.map((x) => <option key={x}>{x}</option>)}</select>
    </div>
  );
}
function Submit({ edit }: { edit: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="a-btn-red">{pending ? "Saving…" : edit ? "Save changes" : "Submit for review"}</button>;
}

export function WorkshopForm({ venues, weeks, window, fixedDepartment, departments, init = {} }: {
  venues: V[]; weeks: { from: string; label: string }[]; window: { from: string; to: string }; fixedDepartment: string | null; departments: string[]; init?: WorkshopInitial;
}) {
  const [state, action] = useFormState<FormResult, FormData>(submitWorkshop, null);
  const [venueId, setVenueId] = useState(init.venueId ?? "");
  const [date, setDate] = useState(init.date ?? window.from);
  const [cap, setCap] = useState<number>(init.capacity ?? 30);
  const v = venues.find((x) => x.id === venueId);
  const week = useMemo(() => { let w = 0; weeks.forEach((x, i) => { if (date >= x.from) w = i + 1; }); return w; }, [date, weeks]);
  const L = ({ children, hint }: { children: React.ReactNode; hint?: string }) => <label className="a-label">{children}{hint && <span className="ml-1 font-normal text-slate-400">{hint}</span>}</label>;

  return (
    <form action={action} className="space-y-6">
      {init.id && <input type="hidden" name="id" value={init.id} />}
      {state?.error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{state.error}</p>}

      <section className="a-card p-6">
        <h2 className="mb-4 font-display text-base font-bold text-slate-900">1 · Workshop</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><L>Workshop title</L><input name="title" required minLength={5} defaultValue={init.title ?? ""} className="a-input" placeholder="e.g. Critical Care Day: Ventilation and Bedside Ultrasound" /></div>
          <div><L>Category</L>
            <select name="category" defaultValue={init.category ?? "A"} className="a-input"><option value="A">A · Multidisciplinary</option><option value="B">B · Departmental</option></select></div>
          <div><L>Format</L><select name="format" defaultValue={init.format ?? "Hands-on"} className="a-input">{FORMATS.map((x) => <option key={x}>{x}</option>)}</select></div>
          <div><L hint={fixedDepartment ? "(your department)" : undefined}>Owning department</L>
            {fixedDepartment ? <input value={fixedDepartment} readOnly className="a-input bg-slate-50" />
              : <><input name="department" list="depts" required defaultValue={init.department ?? ""} className="a-input" placeholder="e.g. Critical Care" /><datalist id="depts">{departments.map((d) => <option key={d} value={d} />)}</datalist></>}</div>
          <div><L hint="(optional)">Contributing departments</L><input name="contributors" defaultValue={init.contributors ?? ""} className="a-input" placeholder="Anaesthesia, Emergency Medicine" /></div>
          <div className="sm:col-span-2"><L>Workshop description</L><textarea name="description" rows={3} maxLength={1200} defaultValue={init.description ?? ""} className="a-input" placeholder="What participants will practise and take away (max 1,200 characters)." /></div>
        </div>
      </section>

      <section className="a-card p-6">
        <h2 className="mb-4 font-display text-base font-bold text-slate-900">2 · Schedule and venue</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><L>Proposed date</L><input type="date" name="date" required min={window.from} max={window.to} value={date} onChange={(e) => setDate(e.target.value)} className="a-input" />
            <p className="mt-1 text-xs text-slate-500">{week ? <>Theme week {week} · {weeks[week - 1]?.label}</> : "Outside the theme weeks"}</p></div>
          <div><L hint="(24-hour)">Start</L><TimePick name="start" value={init.start ?? "09:00"} /></div>
          <div><L hint="(24-hour)">End</L><TimePick name="end" value={init.end ?? "13:00"} /></div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div><L>Venue</L>
              <select name="venueId" required value={venueId} onChange={(e) => { setVenueId(e.target.value); const nv = venues.find((x) => x.id === e.target.value); if (nv && cap > nv.capacity) setCap(nv.capacity); }} className="a-input">
                <option value="">Choose a room…</option>
                {venues.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.building} (seats {x.capacity})</option>)}
              </select></div>
            {v ? (
              <div className="grid gap-3 rounded-xl border border-lnh-blue/20 bg-lnh-blue/[0.04] p-4 text-sm sm:grid-cols-3" aria-live="polite">
                <div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Users className="h-3.5 w-3.5" />Seating capacity</p><p className="mt-1 font-display text-xl font-bold text-slate-900">{v.capacity}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-200"><div className={`h-full rounded-full ${cap > v.capacity ? "bg-lnh-red" : "bg-lnh-blue"}`} style={{ width: `${Math.min(100, (cap / v.capacity) * 100)}%` }} /></div>
                  <p className="mt-1 text-xs text-slate-500">Your cap uses {Math.round((cap / v.capacity) * 100)}%</p></div>
                <div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Monitor className="h-3.5 w-3.5" />Online facility</p><p className="mt-1 font-medium text-slate-800">{v.onlineFacility ?? "None"}</p>{v.equipment && <p className="mt-1 text-xs text-slate-500">{v.equipment}</p>}</div>
                <div><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500"><Building2 className="h-3.5 w-3.5" />Location</p><p className="mt-1 font-medium text-slate-800">{v.building}{v.floor ? `, ${v.floor} floor` : ""}</p>{v.directions && <p className="mt-1 text-xs text-slate-500">{v.directions}</p>}</div>
              </div>
            ) : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-400">Choose a room to see its capacity, online facility and location.</p>}
            <div className="grid gap-4 sm:grid-cols-4">
              <div><L>Seat cap</L><input type="number" name="capacity" min={1} max={v?.capacity} required value={cap} onChange={(e) => setCap(Number(e.target.value))} className="a-input" /></div>
              <div><L>Fee (PKR)</L><input type="number" name="fee" min={0} step={100} defaultValue={init.fee ?? 2000} className="a-input" /></div>
              <div><L hint="(optional)">Early-bird fee</L><input type="number" name="earlyFee" min={0} step={100} defaultValue={init.earlyFee ?? ""} className="a-input" /></div>
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
        <h2 className="mb-4 font-display text-base font-bold text-slate-900">3 · Lead faculty</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><L>Name</L><input name="leadFaculty" required defaultValue={init.leadFaculty ?? ""} className="a-input" placeholder="Dr. Firstname Lastname" /></div>
          <div><L>Degrees</L><input name="facultyDegrees" defaultValue={init.facultyDegrees ?? ""} className="a-input" placeholder="MBBS, FCPS" /></div>
          <div><L>Speaker contact no.</L><input name="facultyContact" inputMode="tel" pattern="(\+92|0)3\d{2}-?\d{7}" defaultValue={init.facultyContact ?? ""} className="a-input" placeholder="0300-1234567" /></div>
          <div className="sm:col-span-3"><L>Education and experience</L><textarea name="facultyProfile" rows={4} maxLength={2000} defaultValue={init.facultyProfile ?? ""} className="a-input" placeholder={"Qualifications, current post, years of experience, previous workshops taught."} /></div>
        </div>
      </section>

      <section className="a-card p-6">
        <h2 className="mb-4 font-display text-base font-bold text-slate-900">4 · People and equipment</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><L>Facilitators</L><input type="number" name="facilitators" min={0} defaultValue={init.facilitators ?? 2} className="a-input" /></div>
          <div><L>Volunteers</L><input type="number" name="volunteers" min={0} defaultValue={init.volunteers ?? 1} className="a-input" /></div>
          <div><L>Technicians</L><input type="number" name="technicians" min={0} defaultValue={init.technicians ?? 0} className="a-input" /></div>
          <div className="sm:col-span-3"><L hint="(one per line: item, quantity, source)">Equipment and consumables</L>
            <textarea name="equipment" rows={4} defaultValue={(init.equipment ?? []).map((e) => `${e.item}, ${e.qty}, ${e.source}`).join("\n")} className="a-input font-mono text-xs" placeholder={"Airway manikin, 4, Skill Lab\nUltrasound machine, 2, Radiology"} />
            <p className="mt-1 text-xs text-slate-500">Source: Skill Lab, department, purchase or sponsor loan. These lines feed the daily requirements sheet.</p></div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Submit edit={!!init.id} />
        <p className="text-xs text-slate-500">After approval the same record produces the catalogue card, the flyer and the daily requirements sheet, and is locked.</p>
      </div>
    </form>
  );
}
