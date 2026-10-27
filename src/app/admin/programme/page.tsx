import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { AlertTriangle, CalendarRange, Lock, Megaphone, Users } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getEvent } from "@/lib/event";
import { personConflicts, slotOf, slotTimes } from "@/lib/programme";
import { PageTitle } from "@/components/admin/ui";
import { WpStatus } from "@/components/admin/wp";
import { SESSION_FORMATS, slotLabel } from "@/lib/scientific";
import { cn, fmtDateTime } from "@/lib/utils";
import { releaseProgramme } from "./actions";

export const metadata = { title: "Scientific programme" };
const SC_BUILDINGS = ["Convention Center", "College of Nursing", "BSMT", "LNMC", "Radiology"];

export default async function Programme({ searchParams }: { searchParams: { day?: string; released?: string } }) {
  const u = await requirePerm("programme");
  const ev = await getEvent();
  const days = [...new Set(ev.sessionSlots.map((x) => x.day))];
  const day = days.includes(searchParams.day ?? "") ? searchParams.day! : days[0];
  const [props, rooms, conflicts, fixed] = await Promise.all([
    db.query.sessions.findMany({ where: and(eq(s.sessions.proposal, true), inArray(s.sessions.status, ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"])), orderBy: asc(s.sessions.createdAt), with: { venue: true, people: true } }),
    db.select().from(s.venues).where(and(eq(s.venues.active, true), inArray(s.venues.building, SC_BUILDINGS))).orderBy(asc(s.venues.building), asc(s.venues.name)),
    personConflicts(),
    db.select().from(s.sessions).where(and(eq(s.sessions.proposal, false), inArray(s.sessions.type, ["KEYNOTE", "PLENARY", "SCIENTIFIC", "PANEL", "CEREMONY"]))),
  ]);
  const live = props.filter((p) => p.status !== "REJECTED");
  const unscheduled = live.filter((p) => !p.slotKey);
  const daySlots = ev.sessionSlots.filter((x) => x.day === day);
  const conflictIds = new Set(conflicts.flatMap((c) => c.sessions.map((x) => x.id)));
  const counts = { DRAFT: 0, SUBMITTED: 0, UNDER_REVIEW: 0, APPROVED: 0, REJECTED: 0 } as Record<string, number>;
  props.forEach((p) => { counts[p.status] = (counts[p.status] ?? 0) + 1; });
  const locked = !!ev.sciLockAt && new Date() > ev.sciLockAt;

  return (
    <>
      <PageTitle title="Scientific programme" sub={`Department session proposals, slot and venue allotment, clash checks. Departments edit until ${ev.sciLockAt ? fmtDateTime(ev.sciLockAt) : "the lock date"}.`}
        actions={<>
          {can(u.role, "programme.edit") && <Link href="/admin/programme/new" className="a-btn-ghost">+ Session for a department</Link>}
          {can(u.role, "programme.edit") && <Link href="/admin/programme/new?format=PLENARY" className="a-btn-ghost">+ Plenary / debate</Link>}
          {can(u.role, "invitations") && <Link href="/admin/invitations" className="a-btn-ghost"><Megaphone className="h-4 w-4" />Invitations</Link>}
          {can(u.role, "programme.approve") && <form action={releaseProgramme.bind(null, !ev.programmeReleasedAt)}><button className={ev.programmeReleasedAt ? "a-btn-ghost" : "a-btn-red"}>{ev.programmeReleasedAt ? "Withdraw release" : "Release approved programme"}</button></form>}
        </>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="a-card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Proposals</p><p className="font-display text-2xl font-bold">{props.length}</p><p className="text-xs text-slate-500">{counts.DRAFT ? `${counts.DRAFT} awaiting department · ` : ""}{counts.SUBMITTED} new · {counts.UNDER_REVIEW} in review · {counts.APPROVED} approved · {counts.REJECTED} rejected</p></div>
        <div className="a-card p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Not yet allotted</p><p className="font-display text-2xl font-bold">{unscheduled.length}</p></div>
        <div className="a-card p-4"><p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" />People clashes</p><p className={cn("font-display text-2xl font-bold", conflicts.length > 0 && "text-rose-600")}>{conflicts.length}</p></div>
        <div className="a-card p-4"><p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500"><Lock className="h-3.5 w-3.5" />Agenda lock</p><p className="font-display text-lg font-bold">{locked ? "Locked" : "Open"}</p><p className="text-xs text-slate-500">{ev.sciLockAt ? fmtDateTime(ev.sciLockAt) : "not set"}</p></div>
        <div className="a-card p-4"><p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500"><Users className="h-3.5 w-3.5" />Visibility</p><p className="font-display text-lg font-bold">{ev.programmeReleasedAt ? "Released" : "Provisional"}</p><p className="text-xs text-slate-500">{ev.programmeReleasedAt ? `since ${fmtDateTime(ev.programmeReleasedAt)}` : "Scientific Committee only"}</p></div>
      </div>

      {conflicts.length > 0 && (
        <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Same person in two places at the same time</p>
          <ul className="mt-2 space-y-1">{conflicts.map((c, i) => { const sl = slotOf(ev.sessionSlots, c.slot); return <li key={i}><b>{c.name}</b> · {sl ? slotLabel(sl) : c.slot} · {c.sessions.map((x, j) => <span key={x.id}>{j ? " and " : ""}<Link href={`/admin/programme/${x.id}`} className="underline">{x.title}</Link></span>)}</li>; })}</ul>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {days.map((d) => <Link key={d} href={`/admin/programme?day=${d}`} className={cn("rounded-lg px-4 py-2 text-sm font-semibold", d === day ? "bg-white text-lnh-navy shadow-sm" : "text-slate-500")}>{new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", weekday: "long", day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00+05:00`))}</Link>)}
      </div>
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th className="min-w-[200px]">Room (capacity)</th>{daySlots.map((sl) => <th key={sl.key} className={cn("min-w-[200px]", sl.special && "bg-lnh-blue/5 text-lnh-navy")}>{sl.start}–{sl.end}{sl.optional ? " (opt.)" : ""}{sl.special && <span className="block normal-case tracking-normal">{sl.special === "PLENARY" ? "Plenary session" : "Debate session"}</span>}</th>)}</tr></thead>
          <tbody>{rooms.map((v) => (
            <tr key={v.id}>
              <td className="text-sm font-medium">{v.name}<span className="block text-xs text-slate-400">{v.capacity} seats</span></td>
              {daySlots.map((sl) => {
                const here = live.filter((p) => p.slotKey === sl.key && p.venueId === v.id);
                const t = slotTimes(sl);
                const other = fixed.filter((x) => x.venueId === v.id && x.startsAt < t.endsAt && x.endsAt > t.startsAt);
                return (
                  <td key={sl.key} className={cn("align-top", here.length > 1 && "bg-rose-50")}>
                    {here.map((p) => (
                      <Link key={p.id} href={`/admin/programme/${p.id}`} className={cn("mb-1 block rounded-lg border px-2 py-1.5 text-xs hover:border-lnh-blue", conflictIds.has(p.id) ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white")}>
                        <span className="font-semibold text-slate-800">{p.title}</span>
                        <span className="block text-slate-500">{p.department} · {p.expectedAudience}/{v.capacity}{(p.expectedAudience ?? 0) > v.capacity && <b className="text-rose-600"> over capacity</b>}</span>
                        <span className="mt-1 inline-block"><WpStatus s={p.status} /></span>
                      </Link>
                    ))}
                    {other.map((x) => <span key={x.id} className="mb-1 block rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-500">{x.title}</span>)}
                  </td>
                );
              })}
            </tr>
          ))}</tbody>
        </table>
      </div>

      <h2 className="mb-3 mt-8 flex items-center gap-2 font-display text-lg font-bold"><CalendarRange className="h-5 w-5 text-lnh-blue" />Waiting for a slot and venue ({unscheduled.length})</h2>
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Session</th><th>Department</th><th>Type</th><th>Preferred</th><th>Expected</th><th>Status</th></tr></thead>
          <tbody>{unscheduled.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/programme/${p.id}`} className="font-medium text-slate-800 hover:text-lnh-blue">{p.title}</Link><p className="text-xs text-slate-400">{p.people.filter((x) => x.role === "CHAIR").map((x) => `Chair: ${x.name}`).join("")}</p></td>
              <td className="text-sm">{p.department}</td>
              <td className="text-xs">{SESSION_FORMATS[p.sessionFormat ?? ""]}</td>
              <td className="text-xs">{p.preferredSlots.map((k) => { const x = slotOf(ev.sessionSlots, k); return x ? slotLabel(x) : k; }).join(" / ")}</td>
              <td className="text-sm">{p.expectedAudience}</td>
              <td><WpStatus s={p.status} /></td>
            </tr>
          ))}</tbody>
        </table>
        {!unscheduled.length && <p className="p-6 text-center text-sm text-slate-400">Every proposal has a slot and a venue.</p>}
      </div>
    </>
  );
}
