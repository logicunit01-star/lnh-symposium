import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PageTitle, StatusBadge, Pager, Empty } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/utils";

const PER = 25;
export default async function Abstracts({ searchParams }: { searchParams: { q?: string; status?: string; type?: string; page?: string } }) {
  await requirePerm("abstracts");
  const page = Math.max(1, Number(searchParams.page) || 1);
  const c: SQL[] = [];
  if (searchParams.q) { const q = `%${searchParams.q}%`; c.push(or(ilike(s.abstracts.refNo, q), ilike(s.abstracts.abstractTitle, q), ilike(s.abstracts.lastName, q), ilike(s.abstracts.organization, q), ilike(s.abstracts.specialty, q))!); }
  if (searchParams.status) c.push(eq(s.abstracts.status, searchParams.status as any));
  if (searchParams.type) c.push(eq(s.abstracts.type, searchParams.type as any));
  const where = c.length ? and(...c) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(s.abstracts).where(where).orderBy(desc(s.abstracts.createdAt)).limit(PER).offset((page - 1) * PER),
    db.select({ n: sql<number>`count(*)::int` }).from(s.abstracts).where(where),
  ]);
  const qs = new URLSearchParams(Object.entries(searchParams).filter(([k, v]) => v && k !== "page") as any).toString();
  return (
    <>
      <PageTitle title="Abstracts" sub={`${n} submissions`} actions={<a href="/api/admin/export/abstracts" className="a-btn-ghost">Export CSV</a>} />
      <form className="a-card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto]">
        <input name="q" defaultValue={searchParams.q} placeholder="Search ref, title, author, organization, specialty…" className="a-input" />
        <select name="type" defaultValue={searchParams.type ?? ""} className="a-input"><option value="">Oral & poster</option><option value="ORAL">Oral</option><option value="POSTER">Poster</option></select>
        <select name="status" defaultValue={searchParams.status ?? ""} className="a-input"><option value="">All statuses</option>{["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "REVISION"].map((x) => <option key={x}>{x}</option>)}</select>
        <button className="a-btn-primary">Filter</button>
      </form>
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Ref</th><th>Title</th><th>Author</th><th>Specialty</th><th>Score</th><th>Status</th><th>Submitted</th></tr></thead>
          <tbody>{rows.map((a) => (
            <tr key={a.id}>
              <td><Link href={`/admin/abstracts/${a.id}`} className="font-mono text-xs font-semibold text-lnh-blue">{a.refNo}</Link><p className="text-[10px] text-slate-400">{a.type}</p></td>
              <td className="max-w-md"><Link href={`/admin/abstracts/${a.id}`} className="font-medium text-slate-800 hover:text-lnh-blue">{a.abstractTitle}</Link></td>
              <td className="text-sm">{a.title} {a.firstName} {a.lastName}<p className="text-xs text-slate-400">{a.organization}</p></td>
              <td className="text-xs text-slate-500">{a.specialty}</td>
              <td>{a.score ?? "—"}</td>
              <td><StatusBadge s={a.status} /></td>
              <td className="whitespace-nowrap text-xs text-slate-500">{fmtDateTime(a.createdAt)}</td>
            </tr>
          ))}</tbody>
        </table>
        {!rows.length && <Empty>No abstracts yet.</Empty>}
        <Pager page={page} pages={Math.ceil(n / PER)} base={`/admin/abstracts${qs ? "?" + qs : ""}`} />
      </div>
    </>
  );
}
