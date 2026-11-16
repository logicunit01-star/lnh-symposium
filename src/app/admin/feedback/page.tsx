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
  // item 5 (16 Nov 2026): overall symposium feedback
  const [sym] = await db.select({ n: sql<number>`count(*)::int`, overall: sql<number>`coalesce(round(avg(overall)::numeric,2),0)::float`, content: sql<number>`coalesce(round(avg(content)::numeric,1),0)::float`,
    speaker: sql<number>`coalesce(round(avg(speaker)::numeric,1),0)::float`, relevance: sql<number>`coalesce(round(avg(relevance)::numeric,1),0)::float`, organization: sql<number>`coalesce(round(avg(organization)::numeric,1),0)::float`,
    rec: sql<number>`coalesce(round(100.0*avg(case when recommend then 1 else 0 end)),0)::int` }).from(s.symposiumFeedback);
  const symComments = await db.select({ c: s.symposiumFeedback.comments, o: s.symposiumFeedback.overall, reg: s.symposiumFeedback.regNo }).from(s.symposiumFeedback)
    .where(sql`${s.symposiumFeedback.comments} is not null`).orderBy(sql`${s.symposiumFeedback.createdAt} desc`).limit(5);
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
      <div className="a-card mt-6 p-5">
        <h2 className="font-display text-base font-bold">Symposium feedback (overall)</h2>
        {sym.n ? <>
          <p className="mt-2 text-sm text-slate-600">{sym.n} response{sym.n === 1 ? "" : "s"} · Overall <b>{sym.overall} / 5</b> · Content {sym.content} · Speakers {sym.speaker} · Relevance {sym.relevance} · Organisation {sym.organization} · Would recommend <b>{sym.rec}%</b></p>
          {symComments.length > 0 && <ul className="mt-3 space-y-1.5 text-sm">{symComments.map((c, k) => <li key={k} className="rounded-lg bg-slate-50 px-3 py-2"><span className="text-amber-600">{"★".repeat(c.o)}</span> {c.c} <span className="text-xs text-slate-400">{c.reg}</span></li>)}</ul>}
        </> : <p className="mt-2 text-sm text-slate-500">No responses yet. Participants who were checked in get a “Give symposium feedback” button on their registration page from Day 1; the form is at /feedback/symposium.</p>}
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
