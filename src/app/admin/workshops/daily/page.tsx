import Link from "next/link";
import { requirePerm, staffScope } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { dailySheet, workshopDates } from "@/lib/wp";
import { PageTitle } from "@/components/admin/ui";
import { WpTabs } from "@/components/admin/wp";
import { PrintButton } from "@/components/admin/PrintButton";
import { cn, fmtDate, ymdPk } from "@/lib/utils";

export const metadata = { title: "Daily requirements" };

export default async function Daily({ searchParams }: { searchParams: { date?: string } }) {
  const u = await requirePerm("workshops");
  const sc = await staffScope(u);
  const dates = await workshopDates(sc);
  const today = ymdPk(new Date());
  const date = searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) ? searchParams.date : dates.find((d) => d >= today) ?? dates[0] ?? today;
  const sheet = await dailySheet(date, sc);
  const day = new Date(`${date}T12:00:00+05:00`);

  return (
    <>
      <div className="print:hidden">
        <PageTitle title="Workshop Programme" sub="Daily requirements: one consolidated sheet per day for the Duty Officer, Skill Lab and stores." />
        <WpTabs active="daily" pending={0} canSubmit={can(u.role, "workshops.submit")} canVenues={can(u.role, "venues")} canCheckin={can(u.role, "checkin")} />
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {dates.map((d) => (
            <Link key={d} href={`/admin/workshops/daily?date=${d}`} className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold ring-1", d === date ? "bg-lnh-navy text-white ring-lnh-navy" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-400")}>
              {fmtDate(new Date(`${d}T12:00:00+05:00`), { weekday: "short", day: "numeric", month: "short" })}
            </Link>
          ))}
          <span className="ml-auto"><PrintButton /></span>
        </div>
      </div>

      <section className="a-card p-6 print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-4">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lnh-red">Daily requirements sheet</p>
            <h2 className="font-display text-2xl font-bold text-slate-900">{fmtDate(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2></div>
          <p className="text-sm text-slate-500">{sheet.rows.length} workshop{sheet.rows.length === 1 ? "" : "s"} · {sheet.seats} participants booked</p>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[["Facilitators", sheet.staff.fac], ["Volunteers", sheet.staff.vol], ["Technicians", sheet.staff.tech], ["Participants", sheet.seats]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-slate-50 p-3 text-center"><p className="font-display text-2xl font-bold text-slate-900">{v}</p><p className="text-xs text-slate-500">{l}</p></div>
          ))}
        </div>

        <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Rooms and timings</h3>
        <table className="a-table mt-2">
          <thead><tr><th>Time</th><th>Workshop</th><th>Venue</th><th>Booked / cap</th><th>Staff (F/V/T)</th><th>Lead faculty</th></tr></thead>
          <tbody>{sheet.rows.map((r) => (
            <tr key={r.w.id}>
              <td className="whitespace-nowrap font-mono text-xs">{r.time}</td>
              <td className="font-medium">{r.w.title}<p className="text-xs font-normal text-slate-400">{r.w.department}</p></td>
              <td className="text-xs">{r.venue?.name ?? r.w.hall}{r.venue && <p className="text-slate-400">{r.venue.building}{r.venue.floor ? `, ${r.venue.floor}` : ""}{r.venue.onlineFacility ? ` · ${r.venue.onlineFacility}` : ""}</p>}</td>
              <td className="text-sm">{r.booked} / {r.w.capacity}</td>
              <td className="font-mono text-xs">{r.w.facilitators}/{r.w.volunteers}/{r.w.technicians}</td>
              <td className="text-xs">{r.w.leadFaculty ?? "—"}{r.w.facultyContact && <p className="text-slate-400">{r.w.facultyContact}</p>}</td>
            </tr>
          ))}
          {!sheet.rows.length && <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">No approved workshops on this day.</td></tr>}</tbody>
        </table>

        <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">Equipment and consumables (consolidated by source)</h3>
        <table className="a-table mt-2">
          <thead><tr><th>Source</th><th>Item</th><th>Qty</th><th>For</th><th className="print:table-cell">✓</th></tr></thead>
          <tbody>{sheet.equipment.map((e, i) => (
            <tr key={i}><td className="text-xs font-semibold">{e.source}</td><td>{e.item}</td><td className="font-mono">{e.qty}</td><td className="text-xs text-slate-500">{e.for.join("; ")}</td><td><span className="inline-block h-4 w-4 rounded border border-slate-400" /></td></tr>
          ))}
          {!sheet.equipment.length && <tr><td colSpan={5} className="py-6 text-center text-sm text-slate-400">No equipment requested.</td></tr>}</tbody>
        </table>
        <p className="mt-6 text-xs text-slate-400">Generated from approved Form A records. Duty Officer signature: ____________________</p>
      </section>
    </>
  );
}
