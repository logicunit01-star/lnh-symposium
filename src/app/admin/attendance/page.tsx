import Link from "next/link";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { attendanceScope } from "@/lib/attendance";
import { PageTitle } from "@/components/admin/ui";
import { cn, fmtDate, fmtDateTime, fmtTime24 } from "@/lib/utils";
import { saveAttendance } from "./actions";

export const metadata = { title: "Workshop attendance" };
export const dynamic = "force-dynamic";

/** N5 / N6 (LNH answers 13 Nov 2026): the department focal person confirms attendance online; the workshop
 *  e-certificate is issued automatically once attendance is confirmed and the participant has given feedback. */
export default async function Attendance({ searchParams }: { searchParams: { w?: string; saved?: string; certs?: string; err?: string; d?: string } }) {
  const u = await requirePerm("attendance");
  const scope = await attendanceScope(u);
  const dept = scope.department ?? (searchParams.d || null);
  const depts = scope.department ? [] : await db.selectDistinct({ d: s.sessions.department }).from(s.sessions)
    .where(and(eq(s.sessions.type, "WORKSHOP"), eq(s.sessions.status, "APPROVED"))).orderBy(asc(s.sessions.department)).then((r) => r.map((x) => x.d).filter(Boolean) as string[]);
  const workshops = await db.select({
    w: s.sessions,
    paid: sql<number>`(select count(*) from registration_items ri join registrations r on r.id = ri.registration_id where ri.session_id = sessions.id and r.payment_status in ('PAID','WAIVED'))::int`,
    verified: sql<number>`(select count(*) from registration_items ri where ri.session_id = sessions.id and ri.verified_at is not null)::int`,
  }).from(s.sessions).where(and(eq(s.sessions.type, "WORKSHOP"), eq(s.sessions.status, "APPROVED"), dept ? eq(s.sessions.department, dept) : undefined))
    .orderBy(asc(s.sessions.startsAt));
  const sel = workshops.find((x) => x.w.id === searchParams.w)?.w ?? null;
  const people = sel ? await db.select({ i: s.registrationItems, r: s.registrations }).from(s.registrationItems)
    .innerJoin(s.registrations, eq(s.registrations.id, s.registrationItems.registrationId))
    .where(and(eq(s.registrationItems.sessionId, sel.id), inArray(s.registrations.paymentStatus, ["PAID", "WAIVED"])))
    .orderBy(asc(s.registrations.lastName), asc(s.registrations.firstName)) : [];
  const fb = sel ? new Set((await db.select({ r: s.feedback.registrationId }).from(s.feedback).where(eq(s.feedback.sessionId, sel.id))).map((x) => x.r)) : new Set();
  const started = sel ? sel.startsAt <= new Date() : false;
  const when = (w: typeof s.sessions.$inferSelect) => w.days > 1 ? `${fmtDate(w.startsAt, { day: "numeric", month: "short" })} – ${fmtDate(w.endsAt, { day: "numeric", month: "short" })}` : `${fmtDate(w.startsAt, { weekday: "short", day: "numeric", month: "short" })} · ${fmtTime24(w.startsAt)}–${fmtTime24(w.endsAt)}`;

  return (
    <>
      <PageTitle title="Workshop attendance" sub={`${scope.department ? `${scope.department}: confirm` : "Department focal persons confirm"} who attended each workshop. The workshop e-certificate is emailed automatically once attendance is confirmed and the participant has submitted the feedback form.`} />
      {scope.department === "__none__" && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Your login has no department. Ask the Super Admin to set it in Users &amp; Roles.</p>}
      {!scope.department && (
        <form className="mb-4 flex flex-wrap items-end gap-2"><div><label className="a-label">Department</label>
          <select name="d" defaultValue={dept ?? ""} className="a-input"><option value="">All departments</option>{depts.map((d) => <option key={d}>{d}</option>)}</select></div>
          <button className="a-btn-ghost">Show</button></form>
      )}
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="a-card divide-y divide-slate-100">
          {workshops.length ? workshops.map(({ w, paid, verified }) => (
            <Link key={w.id} href={`/admin/attendance?w=${w.id}${searchParams.d ? `&d=${encodeURIComponent(searchParams.d)}` : ""}`} className={cn("block px-4 py-3 hover:bg-slate-50", sel?.id === w.id && "bg-lnh-blue/5")}>
              <p className="text-sm font-semibold text-slate-900">{w.title}</p>
              <p className="text-xs text-slate-500">{when(w)}{!scope.department && w.department ? ` · ${w.department}` : ""}</p>
              <p className="mt-1 text-xs"><b>{verified}</b> of {paid} confirmed</p>
            </Link>
          )) : <p className="p-4 text-sm text-slate-500">No approved workshops{dept ? ` for ${dept}` : ""} yet.</p>}
        </div>
        <div>
          {!sel ? <div className="a-card p-6 text-sm text-slate-500">Choose a workshop to confirm attendance.</div> : (
            <form action={saveAttendance.bind(null, sel.id)} className="a-card p-5">
              <h2 className="font-display text-lg font-bold">{sel.title}</h2>
              <p className="text-sm text-slate-500">{when(sel)} · {sel.mode === "ONLINE" ? "Online" : sel.hall}</p>
              {searchParams.saved && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Saved. {searchParams.saved} newly confirmed{Number(searchParams.certs) ? `, ${searchParams.certs} certificate(s) emailed` : ""}.</p>}
              {(searchParams.err === "early" || !started) && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Attendance can be confirmed once the workshop has started.</p>}
              {people.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="a-table">
                    <thead><tr><th>Attended</th><th>Participant</th><th>Ticket</th><th>Desk check-in</th><th>Feedback</th><th>Certificate</th></tr></thead>
                    <tbody>{people.map(({ i, r }) => (
                      <tr key={i.id}>
                        <td><input type="checkbox" name="present" value={i.id} defaultChecked={!!i.verifiedAt || (!i.verifiedAt && !!i.attendedAt)} disabled={!started || !!i.certNo} aria-label={`${r.firstName} ${r.lastName} attended`} />
                          {i.certNo && <input type="hidden" name="present" value={i.id} />}</td>
                        <td><p className="font-medium">{r.title} {r.firstName} {r.lastName}</p><p className="text-xs text-slate-500">{r.email} · {r.phone}</p></td>
                        <td className="font-mono text-xs">{i.ticketNo ?? r.regNo}</td>
                        <td className="text-xs">{i.attendedAt ? fmtDateTime(i.attendedAt) : "—"}</td>
                        <td className="text-xs">{fb.has(r.id) ? <span className="font-semibold text-emerald-700">Submitted</span> : <span className="text-slate-400">Not yet</span>}</td>
                        <td className="text-xs">{i.certNo ? <span className="font-mono text-emerald-700">{i.certNo}</span> : i.verifiedAt ? <span className="text-slate-500">Waiting for feedback</span> : "—"}
                          {i.verifiedAt && <span className="block text-[11px] text-slate-400">Confirmed by {i.verifiedBy}</span>}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button disabled={!started} className="a-btn-primary">Confirm attendance</button>
                    <p className="text-xs text-slate-500">Ticked participants are confirmed. Those checked in at the desk are pre-ticked; untick anyone who did not attend.</p>
                  </div>
                </div>
              ) : <p className="mt-4 text-sm text-slate-500">No paid participants for this workshop.</p>}
            </form>
          )}
        </div>
      </div>
    </>
  );
}
