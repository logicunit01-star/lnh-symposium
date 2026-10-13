import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PageTitle, Stat } from "@/components/admin/ui";
import { fmtTime, SESSION_TYPE_LABEL } from "@/lib/utils";
import { AutoRefresh } from "@/components/admin/AutoRefresh";

export const dynamic = "force-dynamic";
export default async function FeedbackBoard() {
  await requirePerm("feedback");
  const rows = await db.select({
    x: s.sessions, n: sql<number>`count(f.id)::int`,
    overall: sql<number>`round(avg(f.overall)::numeric,2)::float`, content: sql<number>`round(avg(f.content)::numeric,1)::float`,
    speaker: sql<number>`round(avg(f.speaker)::numeric,1)::float`, rec: sql<number>`round(100.0*avg(case when f.recommend then 1 else 0 end))::int`,
  }).from(s.sessions).leftJoin(sql`feedback f`, sql`f.session_id = sessions.id`).where(sql`${s.sessions.type} <> 'BREAK'`)
    .groupBy(s.sessions.id).orderBy(asc(s.sessions.day), asc(s.sessions.startsAt));
  const total = rows.reduce((a, r) => a + r.n, 0);
  const rated = rows.filter((r) => r.n);
  const avg = rated.length ? (rated.reduce((a, r) => a + r.overall * r.n, 0) / total).toFixed(2) : "—";
  const best = [...rated].sort((a, b) => b.overall - a.overall)[0];
  return (
    <>
      <AutoRefresh seconds={10} />
      <PageTitle title="Live feedback" sub="Real-time compilation of QR feedback across all sessions · refreshes every 10 s" actions={<a href="/api/admin/export/feedback" className="a-btn-ghost">Export CSV</a>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Responses" value={total} />
        <Stat label="Average rating" value={`${avg} / 5`} accent="amber" />
        <Stat label="Top-rated session" value={best ? `${best.overall}★` : "—"} sub={best?.x.title} accent="green" />
      </div>
      <div className="a-card mt-6 overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Session</th><th>Responses</th><th>Overall</th><th>Content</th><th>Speaker</th><th>Recommend</th></tr></thead>
          <tbody>{rows.map(({ x, n, overall, content, speaker, rec }) => (
            <tr key={x.id}>
              <td><Link href={`/admin/sessions/${x.id}`} className="font-medium hover:text-lnh-blue">{x.title}</Link><p className="text-xs text-slate-400">Day {x.day} · {fmtTime(x.startsAt)} · {SESSION_TYPE_LABEL[x.type]}</p></td>
              <td>{n}</td>
              <td>{n ? <div className="flex items-center gap-2"><div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-lnh-gold" style={{ width: `${(overall / 5) * 100}%` }} /></div><b>{overall}</b></div> : "—"}</td>
              <td>{n ? content : "—"}</td><td>{n ? speaker : "—"}</td><td>{n ? `${rec}%` : "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  );
}
