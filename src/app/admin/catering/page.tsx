import { Fragment } from "react";
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { getEvent } from "@/lib/event";
import { seatsTaken } from "@/lib/queries";
import { PageTitle } from "@/components/admin/ui";
import { PrintButton } from "@/components/admin/PrintButton";
import { fmtDate, fmtDateTime, fmtTime24 } from "@/lib/utils";

export const metadata = { title: "Catering headcounts" };
export const dynamic = "force-dynamic";

const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(d); // YYYY-MM-DD

/** Food department (read only): expected headcounts per symposium day and per workshop, for meal and tea planning. */
export default async function Catering() {
  await requirePerm("catering");
  const ev = await getEvent();
  const [regs, workshops, taken, sessions, people, listed] = await Promise.all([
    db.select({
      status: s.registrations.paymentStatus, source: s.registrations.source,
      pass: sql<boolean>`(${s.registrations.conferenceFee} > 0 or not exists (select 1 from registration_items ri where ri.registration_id = ${s.registrations.id}))`,
    }).from(s.registrations).where(inArray(s.registrations.paymentStatus, ["PENDING", "PAID", "WAIVED"])),
    db.select({ w: s.sessions, v: s.venues }).from(s.sessions).leftJoin(s.venues, eq(s.venues.id, s.sessions.venueId))
      .where(and(eq(s.sessions.type, "WORKSHOP"), eq(s.sessions.status, "APPROVED"))).orderBy(asc(s.sessions.startsAt)),
    seatsTaken(),
    db.select().from(s.sessions).where(and(ne(s.sessions.type, "WORKSHOP"), ne(s.sessions.type, "BREAK"), inArray(s.sessions.status, ["APPROVED"]))),
    db.select({ sessionId: s.sessionPeople.sessionId, name: s.sessionPeople.name, email: s.sessionPeople.email, status: s.sessionPeople.inviteStatus }).from(s.sessionPeople),
    db.select({ sessionId: s.sessionSpeakers.sessionId, speakerId: s.sessionSpeakers.speakerId }).from(s.sessionSpeakers),
  ]);

  const passConfirmed = regs.filter((r) => r.pass && r.status !== "PENDING").length;
  const passPending = regs.filter((r) => r.pass && r.status === "PENDING").length;
  const onsite = regs.filter((r) => r.pass && r.source === "ONSITE").length;

  // Symposium days: delegates hold a pass for all days; faculty = distinct people on that day's sessions
  const days = ev.eventDays.map((d) => {
    const ses = sessions.filter((x) => dayKey(x.startsAt) === d);
    const ids = new Set(ses.map((x) => x.id));
    const faculty = new Set([
      ...people.filter((p) => ids.has(p.sessionId) && !["DECLINED", "WITHDRAWN"].includes(p.status)).map((p) => (p.email || p.name).toLowerCase()),
      ...listed.filter((x) => ids.has(x.sessionId)).map((x) => `speaker:${x.speakerId}`),
    ]);
    const audience = ses.reduce((a, x) => a + (x.expectedAudience ?? 0), 0);
    return { d, sessions: ses.length, faculty: faculty.size, audience, delegates: passConfirmed + passPending };
  });

  // Workshops: participants + workshop team (lead faculty, facilitators, volunteers, technicians)
  const ws = workshops.map(({ w, v }) => {
    const booked = taken[w.id] ?? 0;
    const team = 1 + (w.facilitators ?? 0) + (w.volunteers ?? 0) + (w.technicians ?? 0);
    return { w, v, booked, team, total: booked + team };
  });
  const byDate = new Map<string, typeof ws>();
  ws.forEach((x) => { const k = dayKey(x.w.startsAt); byDate.set(k, [...(byDate.get(k) ?? []), x]); });

  return (
    <>
      <PageTitle title="Catering headcounts" sub={`Read-only view for the Food department. Figures update live as people register; refreshed ${fmtDateTime(new Date())}.`} actions={<PrintButton />} />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="a-card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Symposium delegates (confirmed)</p><p className="font-display text-3xl font-bold text-slate-900">{passConfirmed}</p><p className="text-xs text-slate-500">Paid or fee waived</p></div>
        <div className="a-card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Awaiting payment</p><p className="font-display text-3xl font-bold text-slate-900">{passPending}</p><p className="text-xs text-slate-500">May still attend; plan a margin</p></div>
        <div className="a-card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Registered at the onsite desk</p><p className="font-display text-3xl font-bold text-slate-900">{onsite}</p><p className="text-xs text-slate-500">Included in the totals</p></div>
      </div>

      <h2 className="mb-2 font-display text-base font-bold text-slate-900">Symposium days</h2>
      <div className="a-card mb-8 overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Day</th><th>Delegates expected</th><th>Speakers, chairs and panelists</th><th>Approved sessions</th><th>Sum of session audiences</th></tr></thead>
          <tbody>{days.map((x, i) => (
            <tr key={x.d}>
              <td className="font-medium">Day {i + 1} · {fmtDate(new Date(`${x.d}T12:00:00+05:00`), { weekday: "long", day: "numeric", month: "long" })}</td>
              <td className="font-display text-lg font-bold">{x.delegates}</td><td>{x.faculty}</td><td>{x.sessions}</td><td>{x.audience}</td>
            </tr>
          ))}</tbody>
        </table>
        <p className="px-4 py-3 text-xs text-slate-500">Delegates hold a pass for all three days (confirmed plus awaiting payment). Session audiences are the departments' estimates per session and overlap across parallel halls.</p>
      </div>

      <h2 className="mb-2 font-display text-base font-bold text-slate-900">Pre-symposium workshops</h2>
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Date</th><th>Time</th><th>Workshop</th><th>Venue</th><th>Participants</th><th>Workshop team</th><th>Total</th></tr></thead>
          <tbody>
            {[...byDate.entries()].map(([d, list]) => (
              <Fragment key={d}>{list.map((x, i) => (
                <tr key={x.w.id}>
                  <td className="whitespace-nowrap">{i === 0 ? fmtDate(x.w.startsAt, { weekday: "short", day: "numeric", month: "short" }) : ""}</td>
                  <td className="whitespace-nowrap font-mono text-xs">{fmtTime24(x.w.startsAt)}–{fmtTime24(x.w.endsAt)}</td>
                  <td className="font-medium">{x.w.title}</td>
                  <td className="text-xs text-slate-500">{x.w.hall ?? x.v?.name ?? "—"}{x.v?.building ? `, ${x.v.building}` : ""}</td>
                  <td>{x.booked}<span className="text-xs text-slate-400"> / {x.w.capacity ?? "—"}</span></td>
                  <td>{x.team}</td><td className="font-bold">{x.total}</td>
                </tr>
              ))}
                <tr key={`${d}-t`} className="bg-slate-50"><td colSpan={6} className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Total for {fmtDate(new Date(`${d}T12:00:00+05:00`), { day: "numeric", month: "short" })}</td><td className="font-display font-bold">{list.reduce((a, x) => a + x.total, 0)}</td></tr>
              </Fragment>
            ))}
            {!ws.length && <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-500">No approved workshops yet.</td></tr>}
          </tbody>
        </table>
        <p className="px-4 py-3 text-xs text-slate-500">Workshop team = lead faculty + facilitators + volunteers + technicians from the approved Form A.</p>
      </div>
    </>
  );
}
