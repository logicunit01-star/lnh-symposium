import Link from "next/link";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getEvent } from "@/lib/event";
import { PageTitle, Stat, Bars, Meter, StatusBadge } from "@/components/admin/ui";
import { fmtDate, fmtDateTime, pkr, SESSION_TYPE_LABEL, TZ } from "@/lib/utils";

export default async function Overview({ searchParams }: { searchParams: { denied?: string } }) {
  const user = await requirePerm("dashboard");
  const ev = await getEvent();
  const active = inArray(s.registrations.paymentStatus, ["PENDING", "PAID", "WAIVED"]);

  const [[tot], byStatus, byCat, daily, sessionsFill, absByStatus, [fb], recent] = await Promise.all([
    db.select({
      n: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(case when payment_status='PAID' then total_fee end),0)::int`,
      outstanding: sql<number>`coalesce(sum(case when payment_status='PENDING' then total_fee end),0)::int`,
      checkedIn: sql<number>`count(checked_in_at)::int`,
    }).from(s.registrations),
    db.select({ k: s.registrations.paymentStatus, n: sql<number>`count(*)::int` }).from(s.registrations).groupBy(s.registrations.paymentStatus),
    db.select({ k: s.feeCategory.label, n: sql<number>`count(${s.registrations.id})::int` }).from(s.feeCategory)
      .leftJoin(s.registrations, and(eq(s.registrations.categoryId, s.feeCategory.id), active)).groupBy(s.feeCategory.label, s.feeCategory.order).orderBy(s.feeCategory.order),
    db.select({ d: sql<string>`to_char(created_at at time zone ${TZ}, 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` }).from(s.registrations)
      .where(gte(s.registrations.createdAt, new Date(Date.now() - 30 * 864e5))).groupBy(sql`1`).orderBy(sql`1`),
    db.select({
      id: s.sessions.id, title: s.sessions.title, type: s.sessions.type, capacity: s.sessions.capacity,
      n: sql<number>`(select count(*) from registration_items ri join registrations r on r.id = ri.registration_id where ri.session_id = sessions.id and r.payment_status in ('PENDING','PAID','WAIVED'))::int`,
    }).from(s.sessions).where(eq(s.sessions.registrable, true)).orderBy(s.sessions.day, s.sessions.startsAt),
    db.select({ k: s.abstracts.status, n: sql<number>`count(*)::int` }).from(s.abstracts).groupBy(s.abstracts.status),
    db.select({ n: sql<number>`count(*)::int`, avg: sql<number>`coalesce(round(avg(overall)::numeric,2),0)::float` }).from(s.feedback),
    db.select().from(s.registrations).orderBy(desc(s.registrations.createdAt)).limit(6),
  ]);

  const st = Object.fromEntries(byStatus.map((r) => [r.k, r.n])) as Record<string, number>;
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 864e5);
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
    return { label: fmtDate(d, { day: "numeric", month: "short" }), value: daily.find((x) => x.d === key)?.n ?? 0 };
  });
  const absTotal = absByStatus.reduce((a, b) => a + b.n, 0);
  const daysToGo = Math.ceil((+ev.startDate - Date.now()) / 864e5);

  return (
    <>
      {searchParams.denied && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">You don’t have access to that section.</p>}
      <PageTitle title={`Welcome, ${user.name.split(" ")[0]}`} sub={`${ev.name} · ${fmtDate(ev.startDate)} · ${daysToGo > 0 ? `${daysToGo} days to go` : "Event in progress / complete"}`}
        actions={can(user.role, "registrations") && <a href="/api/admin/export/registrations" className="a-btn-ghost">Export registrations (CSV)</a>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Registrations" value={tot.n} sub={`${st.PAID ?? 0} paid · ${st.PENDING ?? 0} pending · ${st.WAIVED ?? 0} waived`} />
        <Stat label="Revenue collected" value={pkr(tot.revenue)} sub={`${pkr(tot.outstanding)} outstanding`} accent="green" />
        <Stat label="Abstracts" value={absTotal} sub={absByStatus.map((a) => `${a.n} ${a.k.toLowerCase().replace("_", " ")}`).join(" · ") || "None yet"} accent="red" />
        <Stat label="Checked in / feedback" value={`${tot.checkedIn} / ${fb.n}`} sub={fb.n ? `Avg. session rating ${fb.avg} / 5` : "No feedback yet"} accent="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="a-card p-5 lg:col-span-2">
          <p className="mb-6 text-sm font-semibold text-slate-700">Registrations — last 30 days</p>
          <Bars data={days} />
          <div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>{days[0].label}</span><span>{days[29].label}</span></div>
        </div>
        <div className="a-card p-5">
          <p className="mb-4 text-sm font-semibold text-slate-700">By category</p>
          <ul className="space-y-3">
            {byCat.map((c) => {
              const max = Math.max(1, ...byCat.map((x) => x.n));
              return (
                <li key={c.k}>
                  <div className="flex justify-between text-xs"><span className="text-slate-600">{c.k}</span><span className="font-semibold">{c.n}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-lnh-red" style={{ width: `${(c.n / max) * 100}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="a-card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4"><p className="text-sm font-semibold text-slate-700">Session & workshop capacity</p><Link href="/admin/sessions" className="text-xs font-semibold text-lnh-blue">All sessions →</Link></div>
          <table className="a-table">
            <thead><tr><th>Session</th><th>Type</th><th>Seats</th></tr></thead>
            <tbody>{sessionsFill.map((x) => (
              <tr key={x.id}><td><Link href={`/admin/sessions/${x.id}`} className="font-medium text-slate-800 hover:text-lnh-blue">{x.title}</Link></td><td className="text-xs text-slate-500">{SESSION_TYPE_LABEL[x.type]}</td><td><Meter value={x.n} max={x.capacity} /></td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="a-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4"><p className="text-sm font-semibold text-slate-700">Latest registrations</p><Link href="/admin/registrations" className="text-xs font-semibold text-lnh-blue">View all →</Link></div>
          <ul className="divide-y divide-slate-100">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0"><Link href={`/admin/registrations/${r.id}`} className="block truncate text-sm font-medium text-slate-800 hover:text-lnh-blue">{r.title} {r.firstName} {r.lastName}</Link><p className="text-xs text-slate-400">{r.regNo} · {fmtDateTime(r.createdAt)}</p></div>
                <StatusBadge s={r.paymentStatus} />
              </li>
            ))}
            {!recent.length && <li className="px-5 py-8 text-center text-sm text-slate-400">No registrations yet</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
