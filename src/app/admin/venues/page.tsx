import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageTitle } from "@/components/admin/ui";
import { WpTabs } from "@/components/admin/wp";
import { CampusMap } from "@/components/CampusMap";
import { cn } from "@/lib/utils";
import { deleteVenue, saveVenue } from "../workshops/actions";

export const metadata = { title: "Venues & map" };

export default async function Venues({ searchParams }: { searchParams: { v?: string } }) {
  const u = await requirePerm("venues");
  const venues = await db.select({
    v: s.venues,
    n: sql<number>`(select count(*) from sessions se where se.venue_id = venues.id and se.status <> 'REJECTED')::int`,
  }).from(s.venues).orderBy(asc(s.venues.building), asc(s.venues.name));
  const sel = searchParams.v === "new" ? null : venues.find((x) => x.v.id === searchParams.v)?.v ?? null;
  const editing = searchParams.v === "new" || !!sel;
  const T = ({ n, l, v, t = "text", req }: { n: string; l: string; v?: any; t?: string; req?: boolean }) => <div><label className="a-label">{l}</label><input name={n} type={t} required={req} defaultValue={v ?? ""} className="a-input" step={t === "number" ? "any" : undefined} /></div>;

  return (
    <>
      <PageTitle title="Workshop Programme" sub="Venues: rooms, seating capacity, online facility and location on the campus map. Form A reads these, and the seat cap can't exceed the room." />
      <WpTabs active="venues" pending={0} canSubmit={can(u.role, "workshops.submit")} canVenues canCheckin={can(u.role, "checkin")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="a-card p-3">
            <CampusMap pins={venues.filter((x) => x.v.active).map((x) => x.v)} active={sel?.id} href={(p) => `/admin/venues?v=${p.id}`} className="w-full rounded-lg" />
            <p className="px-2 pt-2 text-xs text-slate-500">Schematic, not to scale. Click a pin to edit. Replace the building blocks with LNH's site plan when available.</p>
          </div>
          <div className="a-card overflow-x-auto">
            <table className="a-table">
              <thead><tr><th>Venue</th><th>Location</th><th>Seats</th><th>Online facility</th><th>Workshops</th><th /></tr></thead>
              <tbody>{venues.map(({ v, n }) => (
                <tr key={v.id} className={cn(!v.active && "opacity-50", sel?.id === v.id && "bg-lnh-blue/5")}>
                  <td className="font-medium">{v.name}{!v.active && <span className="ml-1 text-xs text-slate-400">(inactive)</span>}</td>
                  <td className="text-xs text-slate-500">{v.building}{v.floor ? `, ${v.floor}` : ""}</td>
                  <td>{v.capacity}</td><td className="text-xs">{v.onlineFacility ?? "—"}</td><td>{n}</td>
                  <td><Link href={`/admin/venues?v=${v.id}`} className="text-xs font-semibold text-lnh-blue hover:underline">Edit</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <aside>
          {editing ? (
            <form action={saveVenue.bind(null, sel?.id ?? null)} className="a-card sticky top-6 space-y-3 p-5">
              <h2 className="font-display text-base font-bold">{sel ? `Edit ${sel.name}` : "New venue"}</h2>
              <T n="name" l="Name" v={sel?.name} req /><div className="grid grid-cols-2 gap-3"><T n="building" l="Building" v={sel?.building} req /><T n="floor" l="Floor" v={sel?.floor} /></div>
              <div className="grid grid-cols-2 gap-3"><T n="capacity" l="Seating capacity" t="number" v={sel?.capacity} req /><T n="onlineFacility" l="Online facility" v={sel?.onlineFacility} /></div>
              <T n="equipment" l="Fixed equipment" v={sel?.equipment} />
              <div><label className="a-label">Directions</label><textarea name="directions" rows={2} defaultValue={sel?.directions ?? ""} className="a-input" /></div>
              <div className="grid grid-cols-2 gap-3"><T n="mapX" l="Map X (0–100, left→right)" t="number" v={sel?.mapX ?? 50} /><T n="mapY" l="Map Y (0–100, top→bottom)" t="number" v={sel?.mapY ?? 50} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={sel?.active ?? true} />Active (offered in Form A)</label>
              <div className="flex gap-2"><button className="a-btn-primary">Save venue</button><Link href="/admin/venues" className="a-btn-ghost">Cancel</Link></div>
              {sel && <button formAction={deleteVenue.bind(null, sel.id)} className="text-xs font-semibold text-rose-600 hover:underline">Delete (deactivates if workshops use it)</button>}
            </form>
          ) : (
            <div className="a-card p-5 text-sm text-slate-600">
              <p>Select a venue on the map or in the table to edit it.</p>
              <Link href="/admin/venues?v=new" className="a-btn-primary mt-4">+ Add venue</Link>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
