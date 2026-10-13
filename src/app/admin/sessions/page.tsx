import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageTitle, Meter } from "@/components/admin/ui";
import { fmtDate, fmtTime, pkr, SESSION_TYPE_LABEL } from "@/lib/utils";

export default async function Sessions() {
  const u = await requirePerm("sessions");
  const rows = await db.select({
    x: s.sessions,
    reg: sql<number>`(select count(*) from registration_items ri join registrations r on r.id = ri.registration_id where ri.session_id = sessions.id and r.payment_status in ('PENDING','PAID','WAIVED'))::int`,
    paid: sql<number>`(select count(*) from registration_items ri join registrations r on r.id = ri.registration_id where ri.session_id = sessions.id and r.payment_status in ('PAID','WAIVED'))::int`,
    att: sql<number>`(select count(*) from registration_items ri where ri.session_id = sessions.id and ri.attended_at is not null)::int`,
    fb: sql<number>`(select count(*) from feedback f where f.session_id = sessions.id)::int`,
    avg: sql<number>`(select round(avg(overall)::numeric,1) from feedback f where f.session_id = sessions.id)::float`,
  }).from(s.sessions).orderBy(asc(s.sessions.day), asc(s.sessions.startsAt));
  return (
    <>
      <PageTitle title="Sessions & workshops" sub="Each session has its own dashboard with participants, attendance, live feedback and QR code."
        actions={can(u.role, "sessions.edit") && <Link href="/admin/sessions/new" className="a-btn-primary">+ New session</Link>} />
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Day / time</th><th>Session</th><th>Fee</th><th>Registered</th><th>Paid</th><th>Attended</th><th>Feedback</th></tr></thead>
          <tbody>{rows.map(({ x, reg, paid, att, fb, avg }) => (
            <tr key={x.id}>
              <td className="whitespace-nowrap text-xs text-slate-500">Day {x.day} · {fmtDate(x.startsAt, { day: "numeric", month: "short" })}<br />{fmtTime(x.startsAt)}–{fmtTime(x.endsAt)}</td>
              <td><Link href={`/admin/sessions/${x.id}`} className="font-medium text-slate-800 hover:text-lnh-blue">{x.title}</Link><p className="text-xs text-slate-400">{SESSION_TYPE_LABEL[x.type]}{x.hall ? ` · ${x.hall}` : ""}{x.registrable ? "" : " · open to all"}</p></td>
              <td className="whitespace-nowrap text-xs">{x.fee ? pkr(x.fee) : "—"}</td>
              <td>{x.registrable ? <Meter value={reg} max={x.capacity} /> : <span className="text-xs text-slate-400">n/a</span>}</td>
              <td className="text-sm">{x.registrable ? paid : "—"}</td>
              <td className="text-sm">{att}</td>
              <td className="whitespace-nowrap text-sm">{fb ? <><b>{avg}</b>/5 <span className="text-xs text-slate-400">({fb})</span></> : <span className="text-xs text-slate-400">—</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
