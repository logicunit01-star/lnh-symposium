import Link from "next/link";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { getEvent, isEarlyBird } from "@/lib/event";
import { getProgramme, seatsTaken } from "@/lib/queries";
import { PageTitle, StatusBadge } from "@/components/admin/ui";
import { OnsiteForm } from "@/components/admin/OnsiteForm";
import { fmtDate, fmtDateTime, fmtTime24, pkr } from "@/lib/utils";

export const metadata = { title: "Onsite desk" };

export default async function Onsite({ searchParams }: { searchParams: { done?: string } }) {
  await requirePerm("registrations.edit");
  const [ev, cats, prog, taken] = await Promise.all([
    getEvent(),
    db.select().from(s.feeCategory).where(eq(s.feeCategory.active, true)).orderBy(asc(s.feeCategory.order)),
    getProgramme({ registrable: true }),
    seatsTaken(),
  ]);
  const early = isEarlyBird(ev);
  const items = prog.map((p) => ({
    id: p.id, title: p.title, kind: p.type === "WORKSHOP" ? "WORKSHOP" : "SESSION",
    when: `${fmtDate(p.startsAt, { weekday: "short", day: "numeric", month: "short" })} · ${fmtTime24(p.startsAt)}`,
    fee: early && p.earlyFee != null ? p.earlyFee : p.fee, left: p.capacity == null ? null : Math.max(0, p.capacity - (taken[p.id] ?? 0)),
  }));
  const done = searchParams.done ? await db.query.registrations.findFirst({ where: eq(s.registrations.id, searchParams.done), with: { items: { with: { session: true } } } }) : null;
  const recent = await db.select().from(s.registrations).where(and(eq(s.registrations.source, "ONSITE"))).orderBy(desc(s.registrations.createdAt)).limit(8);

  return (
    <>
      <PageTitle title="Onsite registration desk" sub="Register LNH staff and walk-in participants. Staff choose the LNH category and give their employee ID." />
      {done && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Registered</p>
            <p className="font-display text-2xl font-bold text-slate-900">{done.regNo}</p>
            <p className="text-sm text-slate-600">{done.title} {done.firstName} {done.lastName} · {pkr(done.totalFee)} · <StatusBadge s={done.paymentStatus} /> · {done.items.length} item(s)</p></div>
          <div className="flex gap-2">
            <Link href={`/register/success/${done.accessToken}`} target="_blank" className="a-btn-primary">Open QR pass</Link>
            <a href={`/api/registrations/${done.accessToken}/pdf`} target="_blank" className="a-btn-ghost">Print confirmation</a>
            <Link href={`/admin/registrations/${done.id}`} className="a-btn-ghost">Details</Link>
          </div>
        </div>
      )}
      <OnsiteForm key={done?.id ?? "new"} cats={cats.map((c) => ({ id: c.id, label: c.label, fee: early ? c.earlyFee : c.fee, tier: c.tier }))} items={items} procPct={ev.processingFeePct} />
      {recent.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 font-display text-lg font-bold">Recent desk registrations</h2>
          <div className="a-card overflow-x-auto"><table className="a-table">
            <thead><tr><th>Reg. no.</th><th>Name</th><th>Employee ID</th><th>Total</th><th>Status</th><th>When</th></tr></thead>
            <tbody>{recent.map((r) => (
              <tr key={r.id}><td className="font-mono text-xs"><Link href={`/admin/registrations/${r.id}`} className="text-lnh-blue hover:underline">{r.regNo}</Link></td><td>{r.title} {r.firstName} {r.lastName}</td>
                <td className="font-mono text-xs">{r.employeeId ?? "—"}</td><td className="text-sm">{pkr(r.totalFee)}</td><td><StatusBadge s={r.paymentStatus} /></td><td className="text-xs text-slate-500">{fmtDateTime(r.createdAt)}</td></tr>
            ))}</tbody>
          </table></div>
        </>
      )}
    </>
  );
}
