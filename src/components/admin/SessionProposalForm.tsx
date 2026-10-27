"use client";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { saveProposal, type ProposalResult } from "@/app/admin/programme/actions";
import { cn } from "@/lib/utils";

type Slot = { key: string; day: string; start: string; end: string; optional?: boolean; special?: string };
type P = { name: string; phone: string; email: string };
type G = P & { designation: string; affiliation: string; topic: string; timeSlot: string };
type R = P & { topic: string; timeSlot: string; abstractRef?: string };
export type ProposalInit = {
  id?: string; draft?: boolean; department?: string; title?: string; sessionFormat?: string; formatOther?: string; preferredSlots?: string[]; expectedAudience?: number | null;
  chair?: P; coChair?: P; moderator?: P; panelists?: G[]; speakers?: G[]; presenters?: R[];
};

const FORMATS: [string, string][] = [["INVITED_PAPERS", "Invited speaker(s) + research paper"], ["PAPERS_ONLY", "Research papers only"], ["GUEST_ONLY", "Invited guest speakers only"], ["PANEL", "Panel discussion"], ["CASE_BASED", "Case-based session"], ["OTHER", "Other (please specify)"]];
const SPECIAL: [string, string][] = [["PLENARY", "Plenary session (Day 1, 11:00–13:00)"], ["DEBATE", "Debate session (Day 2, 11:00–13:00)"]];
const emptyP: P = { name: "", phone: "", email: "" };
const emptyG: G = { ...emptyP, designation: "", affiliation: "", topic: "", timeSlot: "" };
const emptyR: R = { ...emptyP, topic: "", timeSlot: "", abstractRef: "" };
// Deterministic (no Intl) so server and browser render the same text
const WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (d: string) => { const x = new Date(`${d}T12:00:00Z`); return `${WD.at(x.getUTCDay())} ${x.getUTCDate()} ${MO.at(x.getUTCMonth())} ${x.getUTCFullYear()}`; };

function Save() { const { pending } = useFormStatus(); return <button disabled={pending} className="a-btn-red">{pending ? "Saving…" : "Save programme details"}</button>; }

export function SessionProposalForm({ slots, departments, fixedDept, templates, templateFiles = {}, acceptedOral, init = {}, readOnly }: {
  slots: Slot[]; departments: string[]; fixedDept: string | null; templates: Record<string, string>; templateFiles?: Record<string, string>;
  acceptedOral: { refNo: string; title: string; author: string; email: string; phone: string }[]; init?: ProposalInit; readOnly?: string | null;
}) {
  const [state, action] = useFormState<ProposalResult, FormData>(saveProposal, null);
  const [d, setD] = useState({
    department: fixedDept ?? init.department ?? "", title: init.title ?? "", sessionFormat: init.sessionFormat ?? "", formatOther: init.formatOther ?? "",
    preferredSlots: init.preferredSlots ?? [], expectedAudience: init.expectedAudience ? String(init.expectedAudience) : "",
    chair: init.chair ?? emptyP, coChair: init.coChair ?? emptyP, moderator: init.moderator ?? emptyP,
    panelists: init.panelists?.length ? init.panelists : [] as G[], speakers: init.speakers?.length ? init.speakers : [] as G[],
    hasPresenters: !!init.presenters?.length, presenters: init.presenters?.length ? init.presenters : [] as R[],
    prefill: !fixedDept && !!init.draft,
  });
  const fe = state?.fields ?? {};
  const err = (k: string) => fe[k] && <p className="mt-1 text-xs text-rose-600">{fe[k]}</p>;
  const special = d.sessionFormat === "PLENARY" || d.sessionFormat === "DEBATE";
  const formats = fixedDept ? FORMATS : [...FORMATS, ...SPECIAL];
  const openSlots = useMemo(() => slots.filter((s) => !s.special), [slots]);
  const fixedSlots = slots.filter((s) => s.special === d.sessionFormat);
  const days = useMemo(() => [...new Set(openSlots.map((s) => s.day))], [openSlots]);
  const set = (patch: Partial<typeof d>) => setD({ ...d, ...patch });
  const payload = JSON.stringify({ ...d, expectedAudience: Number(d.expectedAudience) || 0, panelists: d.panelists, speakers: d.speakers });
  const dis = !!readOnly;
  const pre = d.prefill && !special;

  const PersonRow = ({ label, k, optional }: { label: string; k: "chair" | "coChair" | "moderator"; optional?: boolean }) => (
    <div className="grid gap-3 sm:grid-cols-3">
      <div><label className="a-label">{label} {optional ? <span className="font-normal text-slate-400">(optional)</span> : "*"}</label><input disabled={dis} value={d[k].name} onChange={(e) => set({ [k]: { ...d[k], name: e.target.value } } as any)} className="a-input" />{err(`${k}.name`)}</div>
      <div><label className="a-label">WhatsApp / contact no. *</label><input disabled={dis} value={d[k].phone} onChange={(e) => set({ [k]: { ...d[k], phone: e.target.value } } as any)} className="a-input font-mono" />{err(`${k}.phone`)}</div>
      <div><label className="a-label">Email *</label><input disabled={dis} type="email" value={d[k].email} onChange={(e) => set({ [k]: { ...d[k], email: e.target.value } } as any)} className="a-input" />{err(`${k}.email`)}</div>
    </div>
  );
  const GuestList = ({ k, label }: { k: "panelists" | "speakers"; label: string }) => (
    <div className="space-y-3">
      {d[k].map((g, i) => {
        const up = (patch: Partial<G>) => set({ [k]: d[k].map((x, j) => (j === i ? { ...x, ...patch } : x)) } as any);
        return (
          <div key={i} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">{label} {i + 1}</p>{!dis && <button type="button" onClick={() => set({ [k]: d[k].filter((_, j) => j !== i) } as any)} className="text-rose-600" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>}</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {([["name", "Name"], ["designation", "Designation"], ["affiliation", "Affiliation"], ["phone", "WhatsApp / contact #"], ["email", "Email"], ["timeSlot", "Time slot (e.g. 08:40–09:00)"]] as const).map(([f, l]) => (
                <div key={f}><label className="a-label">{l} *</label><input disabled={dis} value={g[f]} onChange={(e) => up({ [f]: e.target.value })} className="a-input" />{err(`${k}.${i}.${f}`)}</div>
              ))}
              <div className="sm:col-span-3"><label className="a-label">Topic of presentation *</label><input disabled={dis} value={g.topic} onChange={(e) => up({ topic: e.target.value })} className="a-input" />{err(`${k}.${i}.topic`)}</div>
            </div>
          </div>
        );
      })}
      {!dis && <button type="button" onClick={() => set({ [k]: [...d[k], { ...emptyG }] } as any)} className="a-btn-ghost"><Plus className="h-4 w-4" />Add {label.toLowerCase()}</button>}
      {err(k)}
    </div>
  );

  return (
    <form action={action} className="space-y-6">
      {init.id && <input type="hidden" name="id" value={init.id} />}
      <input type="hidden" name="data" value={payload} />
      {readOnly && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{readOnly}</p>}
      {state?.error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{state.error}</p>}

      {!fixedDept && !special && (
        <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm", d.prefill ? "border-lnh-blue bg-lnh-blue/5" : "border-slate-200 bg-white")}>
          <input disabled={dis} type="checkbox" checked={d.prefill} onChange={(e) => set({ prefill: e.target.checked })} className="mt-0.5" />
          <span><b>Pre-fill for the department</b><span className="block text-slate-500">Enter only the department, agreed day/time and expected participants (allot the venue after saving). The department login is emailed to complete the title, session type and people.</span></span>
        </label>
      )}
      <section className="a-card grid gap-4 p-6 sm:grid-cols-2">
        <div><label className="a-label">1 · Department *</label>
          {fixedDept || special ? <input value={special ? "Scientific Committee" : fixedDept!} readOnly className="a-input bg-slate-50" /> : <select disabled={dis} value={d.department} onChange={(e) => set({ department: e.target.value })} className="a-input"><option value="">Choose…</option>{departments.map((x) => <option key={x}>{x}</option>)}</select>}{err("department")}</div>
        <div><label className="a-label">6 · Expected no. of participants / audience *</label><input disabled={dis} type="number" min={1} value={d.expectedAudience} onChange={(e) => set({ expectedAudience: e.target.value })} className="a-input" />{err("expectedAudience")}</div>
        <div className="sm:col-span-2"><label className="a-label">2 · Session title / topic {pre ? <span className="font-normal text-slate-400">(optional)</span> : "*"}</label><input disabled={dis} value={d.title} onChange={(e) => set({ title: e.target.value })} className="a-input" />{err("title")}</div>
        <div className="sm:col-span-2"><label className="a-label">3 · Session type {pre ? <span className="font-normal text-slate-400">(optional)</span> : "*"}</label>
          <div className="grid gap-2 sm:grid-cols-3">{formats.map(([v, l]) => (
            <label key={v} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm", d.sessionFormat === v ? "border-lnh-blue bg-lnh-blue/5" : "border-slate-200")}>
              <input disabled={dis} type="radio" checked={d.sessionFormat === v} onChange={() => set({ sessionFormat: v, ...((v === "PLENARY" || v === "DEBATE") ? { preferredSlots: slots.filter((s) => s.special === v).map((s) => s.key), hasPresenters: false } : special ? { preferredSlots: [] } : {}) })} />{l}</label>
          ))}</div>{err("sessionFormat")}
          {d.sessionFormat === "OTHER" && <input disabled={dis} value={d.formatOther} onChange={(e) => set({ formatOther: e.target.value })} placeholder="Please specify" className="a-input mt-2" />}{err("formatOther")}
          {d.sessionFormat && templates[d.sessionFormat] && <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-600"><b className="font-sans text-slate-800">Agenda template</b>{"\n"}{templates[d.sessionFormat]}</pre>}
          {d.sessionFormat && templateFiles[d.sessionFormat] && <a href={`/api/agenda-templates/${d.sessionFormat}`} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-lnh-blue hover:underline">Download the agenda template ({templateFiles[d.sessionFormat]})</a>}
        </div>
        <p className="text-xs text-slate-500 sm:col-span-2">4 · Venue is allotted by the Scientific Committee.</p>
      </section>

      <section className="a-card p-6">
        <p className="a-label">5 · {special ? "Session day and time (fixed)" : "Preferred session day(s) and time slot(s) *"}</p>
        {special ? (
          <p className="text-sm text-slate-700">{fixedSlots.length ? fixedSlots.map((s) => `${dayLabel(s.day)}, ${s.start}–${s.end}`).join(" · ") : "No slot defined in Event Settings for this session."}</p>
        ) : <div className="grid gap-4 md:grid-cols-3">{days.map((day) => (
          <div key={day}><p className="text-sm font-semibold text-slate-800">{dayLabel(day)}</p>
            {openSlots.filter((s) => s.day === day).map((s) => (
              <label key={s.key} className="mt-1 flex items-center gap-2 text-sm"><input disabled={dis} type="checkbox" checked={d.preferredSlots.includes(s.key)}
                onChange={(e) => set({ preferredSlots: e.target.checked ? [...d.preferredSlots, s.key] : d.preferredSlots.filter((x) => x !== s.key) })} />{s.start}–{s.end}{s.optional && <span className="text-xs text-slate-400">(optional)</span>}</label>
            ))}</div>
        ))}</div>}{err("preferredSlots")}
      </section>

      {!pre && <>
      <section className="a-card space-y-4 p-6">
        <p className="font-display text-base font-bold">7–9 · {special ? "Moderator, Chairperson and Co-Chairperson" : "Chairperson, Co-Chairperson and Moderator"}</p>
        {PersonRow({ label: "Chairperson", k: "chair", optional: special })}
        {PersonRow({ label: "Co-Chairperson", k: "coChair", optional: special })}
        {PersonRow({ label: "Moderator (from LNH)", k: "moderator" })}
      </section>

      <section className="a-card space-y-3 p-6"><p className="font-display text-base font-bold">10 · Panelists {(d.sessionFormat === "PANEL" || d.sessionFormat === "DEBATE") && <span className="text-sm font-normal text-slate-500">(more than one)</span>}</p>{GuestList({ k: "panelists", label: "Panelist" })}</section>
      <section className="a-card space-y-3 p-6"><p className="font-display text-base font-bold">11 · {special ? "Keynote speaker(s)" : "Guest / invited speakers"}</p>{GuestList({ k: "speakers", label: special ? "Keynote speaker" : "Speaker" })}</section>

      {!special && <section className="a-card space-y-3 p-6">
        <p className="font-display text-base font-bold">12 · Research / oral presentations</p>
        <div className="flex gap-4 text-sm"><label className="flex items-center gap-2"><input disabled={dis} type="radio" checked={d.hasPresenters} onChange={() => set({ hasPresenters: true, presenters: d.presenters.length ? d.presenters : [{ ...emptyR }] })} />Yes</label>
          <label className="flex items-center gap-2"><input disabled={dis} type="radio" checked={!d.hasPresenters} onChange={() => set({ hasPresenters: false })} />No</label></div>
        {d.hasPresenters && (
          <div className="space-y-3">
            {acceptedOral.length > 0 && <p className="text-xs text-slate-500">Accepted oral abstracts in your department: {acceptedOral.map((a) => `${a.refNo} (${a.author})`).join(", ")}. Enter the ID to link the abstract.</p>}
            {d.presenters.map((r, i) => {
              const up = (patch: Partial<R>) => set({ presenters: d.presenters.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              const pick = (ref: string) => { const a = acceptedOral.find((x) => x.refNo === ref.toUpperCase()); up(a ? { abstractRef: ref, topic: r.topic || a.title, name: r.name || a.author, email: r.email || a.email, phone: r.phone || a.phone } : { abstractRef: ref }); };
              return (
                <div key={i} className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-6">
                  <div className="sm:col-span-2"><label className="a-label">Presenter's name *</label><input disabled={dis} value={r.name} onChange={(e) => up({ name: e.target.value })} className="a-input" />{err(`presenters.${i}.name`)}</div>
                  <div><label className="a-label">Contact # *</label><input disabled={dis} value={r.phone} onChange={(e) => up({ phone: e.target.value })} className="a-input" />{err(`presenters.${i}.phone`)}</div>
                  <div className="sm:col-span-2"><label className="a-label">Email *</label><input disabled={dis} value={r.email} onChange={(e) => up({ email: e.target.value })} className="a-input" />{err(`presenters.${i}.email`)}</div>
                  <div><label className="a-label">Abstract ID</label><input disabled={dis} value={r.abstractRef ?? ""} onChange={(e) => pick(e.target.value)} placeholder="ABS-2027-…" className="a-input font-mono text-xs" /></div>
                  <div className="sm:col-span-4"><label className="a-label">Research paper / oral presentation title *</label><input disabled={dis} value={r.topic} onChange={(e) => up({ topic: e.target.value })} className="a-input" />{err(`presenters.${i}.topic`)}</div>
                  <div className="sm:col-span-1"><label className="a-label">Time slot *</label><input disabled={dis} value={r.timeSlot} onChange={(e) => up({ timeSlot: e.target.value })} className="a-input" />{err(`presenters.${i}.timeSlot`)}</div>
                  <div className="flex items-end">{!dis && <button type="button" onClick={() => set({ presenters: d.presenters.filter((_, j) => j !== i) })} className="a-btn-ghost text-rose-600"><Trash2 className="h-4 w-4" /></button>}</div>
                </div>
              );
            })}
            {!dis && <button type="button" onClick={() => set({ presenters: [...d.presenters, { ...emptyR }] })} className="a-btn-ghost"><Plus className="h-4 w-4" />Add presenter</button>}
            {err("presenters")}
          </div>
        )}
      </section>}
      </>}
      {!dis && <div className="flex items-center gap-3"><Save /><p className="text-xs text-slate-500">{pre ? "Saved as a draft for the department to complete." : init.draft && fixedDept ? "Pre-filled by the secretariat. Complete the details and save to submit." : "You can edit until the agenda lock date set by the Scientific Committee."}</p></div>}
    </form>
  );
}
