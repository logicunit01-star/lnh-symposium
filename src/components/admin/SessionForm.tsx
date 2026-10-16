import { asc } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import type { Session } from "@/lib/db/schema";
import { TZ } from "@/lib/utils";
import { saveSession, deleteSession } from "@/app/admin/actions";

const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const hm = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);

export async function SessionForm({ session, assigned = [] }: { session?: Session; assigned?: { speakerId: string; role: string }[] }) {
  const speakers = await db.select().from(s.speakers).orderBy(asc(s.speakers.name));
  const x = session;
  const ev = (await db.select().from(s.event))[0];
  const date = x ? ymd(x.startsAt) : ymd(ev.startDate);
  return (
    <form action={saveSession.bind(null, x?.id ?? null)} className="a-card grid gap-4 p-6 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="a-label">Title *</label><input name="title" required defaultValue={x?.title} className="a-input" /></div>
      <div><label className="a-label">Type *</label><select name="type" defaultValue={x?.type ?? "WORKSHOP"} className="a-input">{["KEYNOTE", "PLENARY", "SCIENTIFIC", "PANEL", "WORKSHOP", "CEREMONY", "BREAK"].map((t) => <option key={t}>{t}</option>)}</select></div>
      <div><label className="a-label">Track</label><select name="track" defaultValue={x?.track ?? ""} className="a-input"><option value="">—</option><option>AI</option><option>Robotics</option><option>Digitization</option><option>Cost</option><option>Quality</option><option>Technology</option></select></div>
      <div className="sm:col-span-2"><label className="a-label">Description</label><textarea name="description" rows={3} defaultValue={x?.description ?? ""} className="a-input" /></div>
      <div className="grid grid-cols-4 gap-3 sm:col-span-2">
        <div><label className="a-label">Day no. (0 = workshop) *</label><input name="day" type="number" min={0} defaultValue={x?.day ?? 1} className="a-input" /></div>
        <div><label className="a-label">Date *</label><input name="date" type="date" required defaultValue={date} className="a-input" /></div>
        <div><label className="a-label">Start *</label><input name="start" type="time" required defaultValue={x ? hm(x.startsAt) : "09:00"} className="a-input" /></div>
        <div><label className="a-label">End *</label><input name="end" type="time" required defaultValue={x ? hm(x.endsAt) : "10:00"} className="a-input" /></div>
      </div>
      <div><label className="a-label">Department</label><input name="department" defaultValue={x?.department ?? ""} className="a-input" placeholder="e.g. Critical Care" /></div>
      <div><label className="a-label">Format</label><select name="format" defaultValue={x?.format ?? ""} className="a-input"><option value="">—</option>{["Hands-on", "Simulation", "Lecture", "Panel", "Drill"].map((t) => <option key={t}>{t}</option>)}</select></div>
      <div><label className="a-label">Approval status</label><select name="status" defaultValue={x?.status ?? "APPROVED"} className="a-input">{["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((t) => <option key={t}>{t}</option>)}</select></div>
      <div><label className="a-label">Hall / venue</label><input name="hall" defaultValue={x?.hall ?? ""} className="a-input" /></div>
      <div><label className="a-label">Capacity (blank = unlimited)</label><input name="capacity" type="number" min={0} defaultValue={x?.capacity ?? ""} className="a-input" /></div>
      <div><label className="a-label">Fee (PKR, additional)</label><input name="fee" type="number" min={0} defaultValue={x?.fee ?? 0} className="a-input" /></div>
      <div><label className="a-label">Early-bird fee (PKR)</label><input name="earlyFee" type="number" min={0} defaultValue={x?.earlyFee ?? ""} className="a-input" /></div>
      <div><label className="a-label">CME hours</label><input name="cmeHours" type="number" step="0.5" min={0} defaultValue={x?.cmeHours ?? ""} className="a-input" /></div>
      <div className="flex items-end gap-6 pb-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="registrable" defaultChecked={x?.registrable ?? true} /> Requires registration</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="feedbackOpen" defaultChecked={x?.feedbackOpen ?? true} /> Feedback open</label>
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="a-label">Speakers / facilitators</legend>
        <div className="grid max-h-72 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
          {speakers.map((sp) => {
            const a = assigned.find((z) => z.speakerId === sp.id);
            return (
              <div key={sp.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                <input type="checkbox" name="speakers" value={sp.id} defaultChecked={!!a} id={`sp_${sp.id}`} />
                <label htmlFor={`sp_${sp.id}`} className="flex-1 truncate">{sp.title} {sp.name}</label>
                <select name={`role_${sp.id}`} defaultValue={a?.role ?? "Speaker"} className="rounded border border-slate-200 text-xs">{["Speaker", "Moderator", "Panelist", "Facilitator", "Chair"].map((r) => <option key={r}>{r}</option>)}</select>
              </div>
            );
          })}
        </div>
      </fieldset>
      <div className="flex justify-between sm:col-span-2">
        <button className="a-btn-primary">Save session</button>
        {x && <button formAction={deleteSession.bind(null, x.id)} className="a-btn-ghost text-rose-600" formNoValidate>Delete</button>}
      </div>
    </form>
  );
}
