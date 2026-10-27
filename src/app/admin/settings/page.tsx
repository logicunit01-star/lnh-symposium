import { templateFiles } from "@/lib/programme";
import { asc } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { getEvent } from "@/lib/event";
import { PageTitle } from "@/components/admin/ui";
import { TZ } from "@/lib/utils";
import { saveSettings, saveFee, resetDemoContent } from "../actions";
import { TIER_LABEL } from "@/lib/wp";
import { SESSION_FORMATS } from "@/lib/scientific";

const dt = (d: Date | null) => {
  if (!d) return "";
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour").replace("24", "00")}:${g("minute")}`;
};

export default async function Settings({ searchParams }: { searchParams: { reset?: string } }) {
  const tplFiles = await templateFiles();
  await requirePerm("settings");
  const ev = await getEvent();
  const fees = await db.select().from(s.feeCategory).orderBy(asc(s.feeCategory.order));
  const F = ({ n, l, t = "text", v, span }: { n: string; l: string; t?: string; v?: any; span?: boolean }) => (
    <div className={span ? "sm:col-span-2" : ""}><label className="a-label">{l}</label><input name={n} type={t} defaultValue={v ?? ""} className="a-input" /></div>
  );
  return (
    <>
      <PageTitle title="Event settings" sub="All dates/times are Pakistan time (PKT)." />
      {searchParams.reset && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Demo content has been reset: new programme, workshops and speakers loaded; registrations cleared.</p>}
      <form action={saveSettings} className="a-card grid gap-4 p-6 sm:grid-cols-2">
        <F n="edition" l="Edition" v={ev.edition} /><F n="name" l="Event name" v={ev.name} />
        <F n="theme" l="Event title / theme" v={ev.theme} span /><F n="mainTheme" l="Main theme" v={ev.mainTheme} span /><F n="tagline" l="Tagline" v={ev.tagline} span />
        <F n="eventDays" l="Symposium days (YYYY-MM-DD, comma separated)" v={ev.eventDays.join(", ")} span />
        <F n="regPrefix" l="Registration number prefix (e.g. SYM → SYM-2027-00001)" v={ev.regPrefix} /><F n="processingFeePct" l="Tax & processing fee (%)" t="number" v={ev.processingFeePct} />
        <F n="startDate" l="Starts" t="datetime-local" v={dt(ev.startDate)} /><F n="endDate" l="Ends" t="datetime-local" v={dt(ev.endDate)} />
        <F n="venue" l="Venue" v={ev.venue} span />
        <F n="virtualLink" l="Virtual platform link" v={ev.virtualLink} /><F n="heroVideoUrl" l="Hero background video URL (.mp4)" v={ev.heroVideoUrl} />
        <F n="earlyBirdUntil" l="Early-bird ends" t="datetime-local" v={dt(ev.earlyBirdUntil)} />
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="registrationOpen" defaultChecked={ev.registrationOpen} /> Registration open</label>
        <F n="abstractOpen" l="Abstract submission opens" t="datetime-local" v={dt(ev.abstractOpen)} /><F n="abstractDeadline" l="Abstract deadline" t="datetime-local" v={dt(ev.abstractDeadline)} />
        <F n="abstractWordLimit" l="Abstract word limit" t="number" v={ev.abstractWordLimit} /><div />
        <p className="sm:col-span-2 mt-2 border-t border-slate-200 pt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Pre-symposium workshops</p>
        <F n="workshopStart" l="Workshop window opens" t="datetime-local" v={dt(ev.workshopStart)} /><F n="workshopEnd" l="Workshop window closes" t="datetime-local" v={dt(ev.workshopEnd)} />
        <div className="sm:col-span-2"><label className="a-label">Theme weeks (one per line: YYYY-MM-DD start, label)</label><textarea name="themeWeeks" rows={5} defaultValue={ev.themeWeeks.map((w) => `${w.from}, ${w.label}`).join("\n")} className="a-input font-mono text-xs" /></div>
        <F n="seatTarget" l="Seat target (committee dashboard)" t="number" v={ev.seatTarget} /><F n="usdRate" l="PKR per USD (revenue dashboard)" t="number" v={ev.usdRate} />
        <p className="sm:col-span-2 mt-2 border-t border-slate-200 pt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Scientific programme</p>
        <div className="sm:col-span-2"><label className="a-label">Session slots (one per line: YYYY-MM-DD HH:MM-HH:MM; add "optional", or "plenary" / "debate" for the committee's fixed sessions)</label><textarea name="sessionSlots" rows={11} defaultValue={ev.sessionSlots.map((s) => `${s.day} ${s.start}-${s.end}${s.optional ? " optional" : ""}${s.special ? ` ${s.special.toLowerCase()}` : ""}`).join("\n")} className="a-input font-mono text-xs" /></div>
        <F n="abstractP1Open" l="Abstract review Phase 1 opens (HODs)" t="datetime-local" v={dt(ev.abstractP1Open)} /><F n="abstractP1Close" l="Phase 1 closes" t="datetime-local" v={dt(ev.abstractP1Close)} />
        <F n="abstractP2Open" l="Phase 2 opens (reassigned abstracts)" t="datetime-local" v={dt(ev.abstractP2Open)} /><F n="abstractP2Close" l="Phase 2 closes" t="datetime-local" v={dt(ev.abstractP2Close)} />
        <F n="sciLockAt" l="Department agenda lock date" t="datetime-local" v={dt(ev.sciLockAt)} /><div />
        {Object.entries(SESSION_FORMATS).map(([k, label]) => (
          <div key={k} className="sm:col-span-2"><label className="a-label">Agenda template: {label}</label><textarea name={`tpl_${k}`} rows={3} defaultValue={ev.agendaTemplates?.[k] ?? ""} className="a-input font-mono text-xs" />
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <input type="file" name={`tplfile_${k}`} accept=".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx" className="text-xs file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold" aria-label={`Upload template file for ${label}`} />
              {tplFiles[k] ? <><a href={`/api/agenda-templates/${k}`} className="font-semibold text-lnh-blue hover:underline">{tplFiles[k]}</a><label className="flex items-center gap-1"><input type="checkbox" name={`tplfile_del_${k}`} />remove</label></> : <span>No file uploaded (Word, PDF, Excel or PowerPoint, up to 5 MB)</span>}
            </div></div>
        ))}
        <F n="contactEmail" l="Contact email" v={ev.contactEmail} /><F n="contactPhone" l="Contact phone" v={ev.contactPhone} />
        <F n="facebook" l="Facebook" v={ev.facebook} /><F n="instagram" l="Instagram" v={ev.instagram} />
        <F n="linkedin" l="LinkedIn" v={ev.linkedin} /><F n="youtube" l="YouTube" v={ev.youtube} /><F n="x" l="X / Twitter" v={ev.x} />
        <div className="sm:col-span-2"><label className="a-label">Homepage videos (YouTube URLs, one per line)</label><textarea name="videos" rows={3} defaultValue={ev.videos.join("\n")} className="a-input" /></div>
        <div className="sm:col-span-2"><button className="a-btn-primary">Save settings</button></div>
      </form>
      <form action={resetDemoContent} className="a-card mt-6 flex flex-wrap items-center justify-between gap-3 border-rose-200 p-5">
        <div><p className="font-semibold text-slate-800">Reset demo content</p><p className="text-sm text-slate-500">Loads the 2027 demo programme (AI · Robotics · Digitization days and pre-conference workshops) and event dates. Deletes all registrations, accounts, programme, speakers and committee. Super Admin only.</p></div>
        <button className="a-btn-red">Reset demo content</button>
      </form>
      <h2 className="mb-3 mt-10 font-display text-lg font-bold">Registration categories & fees (PKR)</h2>
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Order</th><th>Code</th><th>Label</th><th>Early-bird</th><th>Regular</th><th>Revenue tier</th><th>Note</th><th>Active</th><th /></tr></thead>
          <tbody>{[...fees, null].map((f) => {
            const id = f ? `f_${f.id}` : "f_new";
            return (
              <tr key={id}>
                <td><input form={id} name="order" type="number" defaultValue={f?.order ?? fees.length + 1} className="a-input w-16" /></td>
                <td><input form={id} name="code" required defaultValue={f?.code ?? ""} className="a-input w-24" /></td>
                <td><input form={id} name="label" required defaultValue={f?.label ?? ""} placeholder={f ? "" : "New category…"} className="a-input" /></td>
                <td><input form={id} name="earlyFee" type="number" defaultValue={f?.earlyFee ?? ""} className="a-input w-24" /></td>
                <td><input form={id} name="fee" type="number" defaultValue={f?.fee ?? ""} className="a-input w-24" /></td>
                <td><select form={id} name="tier" defaultValue={f?.tier ?? "GENERAL"} className="a-input w-32">{Object.entries(TIER_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                <td><input form={id} name="note" defaultValue={f?.note ?? ""} className="a-input" /></td>
                <td><input form={id} name="active" type="checkbox" defaultChecked={f?.active ?? true} /></td>
                <td><form id={id} action={saveFee.bind(null, f?.id ?? null)}><button className="a-btn-primary py-1.5 text-xs">{f ? "Save" : "Add"}</button></form></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </>
  );
}
