import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PageTitle, StatusBadge, Pager, Empty } from "@/components/admin/ui";
import { fmtDateTime, pkr } from "@/lib/utils";

const PER = 25;
export default async function Registrations({ searchParams }: { searchParams: { q?: string; status?: string; cat?: string; page?: string } }) {
  await requirePerm("registrations");
  const page = Math.max(1, Number(searchParams.page) || 1);
  const conds: SQL[] = [];
  if (searchParams.q) {
    const q = `%${searchParams.q.trim()}%`;
    conds.push(or(ilike(s.registrations.regNo, q), ilike(s.registrations.firstName, q), ilike(s.registrations.lastName, q), ilike(s.registrations.email, q), ilike(s.registrations.phone, q), ilike(s.registrations.institution, q))!);
  }
  if (searchParams.status) conds.push(eq(s.registrations.paymentStatus, searchParams.status as any));
  if (searchParams.cat) conds.push(eq(s.registrations.categoryId, Number(searchParams.cat)));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ n }], cats] = await Promise.all([
    db.select({ r: s.registrations, cat: s.feeCategory.label }).from(s.registrations).innerJoin(s.feeCategory, eq(s.feeCategory.id, s.registrations.categoryId))
      .where(where).orderBy(desc(s.registrations.createdAt)).limit(PER).offset((page - 1) * PER),
    db.select({ n: sql<number>`count(*)::int` }).from(s.registrations).where(where),
    db.select().from(s.feeCategory).orderBy(s.feeCategory.order),
  ]);
  const qs = new URLSearchParams(Object.entries(searchParams).filter(([k, v]) => v && k !== "page") as any).toString();
  return (
    <>
      <PageTitle title="Registrations" sub={`${n} matching`} actions={<a href="/api/admin/export/registrations" className="a-btn-ghost">Export CSV</a>} />
      <form className="a-card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto]">
        <input name="q" defaultValue={searchParams.q} placeholder="Search name, reg no., email, phone, institution…" className="a-input" />
        <select name="status" defaultValue={searchParams.status ?? ""} className="a-input"><option value="">All statuses</option>{["PENDING", "PAID", "WAIVED", "FAILED", "REFUNDED"].map((x) => <option key={x}>{x}</option>)}</select>
        <select name="cat" defaultValue={searchParams.cat ?? ""} className="a-input"><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
        <button className="a-btn-primary">Filter</button>
      </form>
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Reg no.</th><th>Name</th><th>Institution</th><th>Category</th><th>Fee</th><th>Status</th><th>Checked in</th><th>Registered</th></tr></thead>
          <tbody>
            {rows.map(({ r, cat }) => (
              <tr key={r.id}>
                <td><Link href={`/admin/registrations/${r.id}`} className="font-mono text-xs font-semibold text-lnh-blue">{r.regNo}</Link></td>
                <td><Link href={`/admin/registrations/${r.id}`} className="font-medium text-slate-800">{r.title} {r.firstName} {r.lastName}</Link><p className="text-xs text-slate-400">{r.email} · {r.phone}</p></td>
                <td className="text-slate-600">{r.institution}</td>
                <td className="text-xs text-slate-500">{cat}</td>
                <td className="whitespace-nowrap">{pkr(r.totalFee)}</td>
                <td><StatusBadge s={r.paymentStatus} /></td>
                <td>{r.checkedInAt ? <span className="badge bg-emerald-100 text-emerald-700">Yes</span> : <span className="text-xs text-slate-400">—</span>}</td>
                <td className="whitespace-nowrap text-xs text-slate-500">{fmtDateTime(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>No registrations found.</Empty>}
        <Pager page={page} pages={Math.ceil(n / PER)} base={`/admin/registrations${qs ? "?" + qs : ""}`} />
      </div>
    </>
  );
}
