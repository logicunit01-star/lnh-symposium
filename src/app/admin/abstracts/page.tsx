import Link from "next/link";
import { and, asc, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageTitle, StatusBadge, Pager, Empty } from "@/components/admin/ui";
import { HOD_DECISION_LABEL, PREF_LABEL } from "@/lib/scientific";
import { fmtDateTime } from "@/lib/utils";
import { assignAbstractVenue, notifyDecisions } from "./actions";

const PER = 25;
export default async function Abstracts({ searchParams }: { searchParams: { q?: string; status?: string; dept?: string; pref?: string; page?: string; notified?: string } }) {
  const u = await requirePerm("abstracts");
  const page = Math.max(1, Number(searchParams.page) || 1);
  const c: SQL[] = [];
  if (searchParams.q) { const q = `%${searchParams.q}%`; c.push(or(ilike(s.abstracts.refNo, q), ilike(s.abstracts.abstractTitle, q), ilike(s.abstracts.fullName, q), ilike(s.abstracts.presentingAuthor, q), ilike(s.abstracts.authors, q), ilike(s.abstracts.organization, q))!); }
  if (searchParams.status) c.push(eq(s.abstracts.status, searchParams.status as any));
  if (searchParams.dept) c.push(or(eq(s.abstracts.specialty, searchParams.dept), eq(s.abstracts.assignedDept, searchParams.dept))!);
  if (searchParams.pref) c.push(eq(s.abstracts.presentationPref, searchParams.pref));
  const where = c.length ? and(...c) : undefined;
  const [rows, [{ n }], counts, depts, [{ unnotified }]] = await Promise.all([
    db.select().from(s.abstracts).where(where).orderBy(desc(s.abstracts.createdAt)).limit(PER).offset((page - 1) * PER),
    db.select({ n: sql<number>`count(*)::int` }).from(s.abstracts).where(where),
    db.select({ k: s.abstracts.status, n: sql<number>`count(*)::int` }).from(s.abstracts).groupBy(s.abstracts.status),
    db.select({ name: s.departments.name }).from(s.departments).orderBy(asc(s.departments.name)),
    db.select({ unnotified: sql<number>`count(*)::int` }).from(s.abstracts).where(and(sql`status in ('ACCEPTED','REJECTED')`, isNull(s.abstracts.authorNotifiedAt))),
  ]);
  const venues = await db.select({ id: s.venues.id, name: s.venues.name, building: s.venues.building }).from(s.venues).where(eq(s.venues.active, true)).orderBy(asc(s.venues.building), asc(s.venues.name));
  const canAssign = can(u.role, "abstracts.review");
  const here = `/admin/abstracts${Object.keys(searchParams).length ? "?" + new URLSearchParams(searchParams as any).toString() : ""}`;
  const cnt = (k: string) => counts.find((x) => x.k === k)?.n ?? 0;
  const qs = new URLSearchParams(Object.entries(searchParams).filter(([k, v]) => v && k !== "page" && k !== "notified") as any).toString();
  const stage = [["SUBMITTED", "With departments"], ["UNDER_REVIEW", "Awaiting SC check"], ["BACK", "Back to secretariat"], ["ACCEPTED", "Accepted"], ["REJECTED", "Rejected"]];
  return (
    <>
      <PageTitle title="Abstracts" sub="Departments review first (Phase 1), the Scientific Committee checks quality and reassigns returned abstracts (Phase 2), then decisions are emailed."
        actions={<>
          {can(u.role, "venues") && <Link href="/admin/venues" className="a-btn-ghost">Venue master</Link>}
          <a href="/api/admin/export/abstracts" className="a-btn-ghost">Export CSV</a>
          <Link href="/abstracts/book?preview=1" className="a-btn-ghost">e-Abstract book</Link>
          {can(u.role, "abstracts.review") && unnotified > 0 && <form action={notifyDecisions}><button className="a-btn-red">Email {unnotified} decision{unnotified > 1 ? "s" : ""}</button></form>}
        </>} />
      {searchParams.notified && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{searchParams.notified} decision email(s) sent.</p>}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {stage.map(([k, l]) => (
          <Link key={k} href={`/admin/abstracts?status=${k}`} className={`a-card p-3 ${searchParams.status === k ? "border-lnh-blue" : ""}`}><p className="font-display text-2xl font-bold text-slate-900">{cnt(k)}</p><p className="text-xs text-slate-500">{l}</p></Link>
        ))}
      </div>
      <form className="a-card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <input name="q" defaultValue={searchParams.q} placeholder="Search by ID, title, author name or organization…" className="a-input" />
        <select name="dept" defaultValue={searchParams.dept ?? ""} className="a-input"><option value="">All departments</option>{depts.map((d) => <option key={d.name}>{d.name}</option>)}</select>
        <select name="pref" defaultValue={searchParams.pref ?? ""} className="a-input"><option value="">Any format</option>{Object.entries(PREF_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="status" defaultValue={searchParams.status ?? ""} className="a-input"><option value="">All stages</option>{stage.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <button className="a-btn-primary">Filter</button>
      </form>
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>ID</th><th>Title</th><th>Presenting author</th><th>Department</th><th>Preferred</th><th>Department decision</th><th>Stage</th><th className="min-w-[260px]">Venue · placement</th></tr></thead>
          <tbody>{rows.map((a) => (
            <tr key={a.id}>
              <td><Link href={`/admin/abstracts/${a.id}`} className="font-mono text-xs font-semibold text-lnh-blue">{a.refNo}</Link><p className="text-[10px] text-slate-400">{fmtDateTime(a.createdAt)}</p></td>
              <td className="max-w-md"><Link href={`/admin/abstracts/${a.id}`} className="font-medium text-slate-800 hover:text-lnh-blue">{a.abstractTitle}</Link></td>
              <td className="text-sm">{a.presentingAuthor}<p className="text-xs text-slate-400">{a.organization}</p></td>
              <td className="text-xs text-slate-600">{a.assignedDept ?? a.specialty}{a.phase === 2 && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-800">P2</span>}</td>
              <td className="text-xs">{PREF_LABEL[a.presentationPref ?? ""] ?? a.type}</td>
              <td className="text-xs">{a.hodDecision ? <>{HOD_DECISION_LABEL[a.hodDecision]}<span className="text-slate-400"> · {a.hodTotal}/25</span></> : <span className="text-slate-400">—</span>}</td>
              <td><StatusBadge s={a.status} />{a.acceptedAs && <span className="ml-1 text-[10px] font-bold text-emerald-700">{a.acceptedAs}</span>}</td>
              <td>{a.status === "ACCEPTED" && canAssign ? (
                <form action={assignAbstractVenue.bind(null, a.id)} className="flex flex-wrap items-center gap-1">
                  <input type="hidden" name="back" value={here} />
                  <select name="venueId" defaultValue={a.venueId ?? ""} className="a-input w-40 py-1 text-xs" aria-label={`Venue for ${a.refNo}`}><option value="">No venue</option>{venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                  <input name="placement" defaultValue={a.placement ?? ""} placeholder={a.acceptedAs === "POSTER" ? "Board no., day" : "Slot, remarks"} className="a-input w-28 py-1 text-xs" aria-label={`Placement for ${a.refNo}`} />
                  <button className="a-btn-ghost px-2 py-1 text-xs">Save</button>
                </form>
              ) : <span className="text-xs text-slate-500">{[venues.find((v) => v.id === a.venueId)?.name, a.placement].filter(Boolean).join(" · ") || "—"}</span>}</td>
            </tr>
          ))}</tbody>
        </table>
        {!rows.length && <Empty>No abstracts match.</Empty>}
        <Pager page={page} pages={Math.ceil(n / PER)} base={`/admin/abstracts${qs ? "?" + qs : ""}`} />
      </div>
    </>
  );
}
