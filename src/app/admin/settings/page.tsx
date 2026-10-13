import { asc } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { getEvent } from "@/lib/event";
import { PageTitle } from "@/components/admin/ui";
import { TZ } from "@/lib/utils";
import { saveSettings, saveFee } from "../actions";

const dt = (d: Date | null) => {
  if (!d) return "";
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour").replace("24", "00")}:${g("minute")}`;
};

export default async function Settings() {
  await requirePerm("settings");
  const ev = await getEvent();
  const fees = await db.select().from(s.feeCategory).orderBy(asc(s.feeCategory.order));
  const F = ({ n, l, t = "text", v, span }: { n: string; l: string; t?: string; v?: any; span?: boolean }) => (
    <div className={span ? "sm:col-span-2" : ""}><label className="a-label">{l}</label><input name={n} type={t} defaultValue={v ?? ""} className="a-input" /></div>
  );
  return (
    <>
      <PageTitle title="Event settings" sub="All dates/times are Pakistan time (PKT)." />
      <form action={saveSettings} className="a-card grid gap-4 p-6 sm:grid-cols-2">
        <F n="edition" l="Edition" v={ev.edition} /><F n="name" l="Event name" v={ev.name} />
        <F n="theme" l="Theme" v={ev.theme} span /><F n="tagline" l="Tagline" v={ev.tagline} span />
        <F n="startDate" l="Starts" t="datetime-local" v={dt(ev.startDate)} /><F n="endDate" l="Ends" t="datetime-local" v={dt(ev.endDate)} />
        <F n="venue" l="Venue" v={ev.venue} span />
        <F n="virtualLink" l="Virtual platform link" v={ev.virtualLink} /><F n="heroVideoUrl" l="Hero background video URL (.mp4)" v={ev.heroVideoUrl} />
        <F n="earlyBirdUntil" l="Early-bird ends" t="datetime-local" v={dt(ev.earlyBirdUntil)} />
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="registrationOpen" defaultChecked={ev.registrationOpen} /> Registration open</label>
        <F n="abstractOpen" l="Abstract submission opens" t="datetime-local" v={dt(ev.abstractOpen)} /><F n="abstractDeadline" l="Abstract deadline" t="datetime-local" v={dt(ev.abstractDeadline)} />
        <F n="abstractWordLimit" l="Abstract word limit" t="number" v={ev.abstractWordLimit} /><div />
        <F n="contactEmail" l="Contact email" v={ev.contactEmail} /><F n="contactPhone" l="Contact phone" v={ev.contactPhone} />
        <F n="facebook" l="Facebook" v={ev.facebook} /><F n="instagram" l="Instagram" v={ev.instagram} />
        <F n="linkedin" l="LinkedIn" v={ev.linkedin} /><F n="youtube" l="YouTube" v={ev.youtube} /><F n="x" l="X / Twitter" v={ev.x} />
        <div className="sm:col-span-2"><label className="a-label">Homepage videos (YouTube URLs, one per line)</label><textarea name="videos" rows={3} defaultValue={ev.videos.join("\n")} className="a-input" /></div>
        <div className="sm:col-span-2"><button className="a-btn-primary">Save settings</button></div>
      </form>
      <h2 className="mb-3 mt-10 font-display text-lg font-bold">Registration categories & fees (PKR)</h2>
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Order</th><th>Code</th><th>Label</th><th>Early-bird</th><th>Regular</th><th>Note</th><th>Active</th><th /></tr></thead>
          <tbody>{[...fees, null].map((f) => {
            const id = f ? `f_${f.id}` : "f_new";
            return (
              <tr key={id}>
                <td><input form={id} name="order" type="number" defaultValue={f?.order ?? fees.length + 1} className="a-input w-16" /></td>
                <td><input form={id} name="code" required defaultValue={f?.code ?? ""} className="a-input w-24" /></td>
                <td><input form={id} name="label" required defaultValue={f?.label ?? ""} placeholder={f ? "" : "New category…"} className="a-input" /></td>
                <td><input form={id} name="earlyFee" type="number" defaultValue={f?.earlyFee ?? ""} className="a-input w-24" /></td>
                <td><input form={id} name="fee" type="number" defaultValue={f?.fee ?? ""} className="a-input w-24" /></td>
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
