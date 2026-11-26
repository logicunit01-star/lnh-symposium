import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireDept } from "@/lib/dept";
import { getEvent } from "@/lib/event";
import { acceptedOralFor, alsoAppearsIn, editRule, flyerLocked, proposalInit, revisionOpen, slotOf, templateFiles } from "@/lib/programme";
import { OriginalAgenda } from "@/components/admin/OriginalAgenda";
import { PageTitle } from "@/components/admin/ui";
import { WpStatus } from "@/components/admin/wp";
import { SessionProposalForm } from "@/components/admin/SessionProposalForm";
import { PEOPLE_ROLES, SESSION_FORMATS, slotLabel } from "@/lib/scientific";
import { fmtDateTime } from "@/lib/utils";

import { DeptSwitcher } from "@/components/admin/DeptSwitcher";
import { deptsWith } from "@/lib/permissions";
export const metadata = { title: "Scientific session agenda" };

export default async function DeptSessions({ searchParams }: { searchParams: { edit?: string; new?: string; saved?: string } }) {
  const { u, deptName } = await requireDept("dept.sessions");
  const ev = await getEvent();
  const released = !!ev.programmeReleasedAt;
  const locked = !!ev.sciLockAt && new Date() > ev.sciLockAt;
  const rows = await db.query.sessions.findMany({ where: and(eq(s.sessions.department, deptName), eq(s.sessions.proposal, true)), orderBy: asc(s.sessions.createdAt), with: { people: true, venue: true } });
  const common = { slots: ev.sessionSlots, departments: [], fixedDept: deptName, templates: ev.agendaTemplates, templateFiles: await templateFiles(), acceptedOral: await acceptedOralFor(deptName) };

  if (searchParams.new || searchParams.edit) {
    const data = searchParams.edit ? await proposalInit(searchParams.edit) : null;
    if (searchParams.edit && (!data || data.session.department !== deptName)) return <p>Not found.</p>;
    // 26 Nov 2026: a session the Scientific Committee sent back opens for editing until its deadline; the save is a draft
    const reopen = !!data && revisionOpen(data.session);
    const block = reopen ? null : data ? editRule({ role: u.role, isDept: true, ownDept: true, lockAt: ev.sciLockAt, locked: data.session.locked, flyerLocked: flyerLocked(data.session) }) : locked ? "The agenda deadline has passed. Only the Scientific Committee can add or change sessions now." : null;
    const init = data && reopen && data.session.revisionData ? { ...data.init, ...(data.session.revisionData as any), id: data.session.id } : data?.init;
    const also = data ? await alsoAppearsIn(data.session.id) : [];
    return (
      <>
        <p className="mb-2 text-sm"><Link href="/admin/dept/sessions" className="text-lnh-blue hover:underline">← Sessions</Link></p>
        <PageTitle title={data ? `Edit: ${data.session.title}` : "Scientific Sessions' Program Details"} sub={`${ev.name} · ${ev.mainTheme}`} />
        {also.length > 0 && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Also in other sessions: {also.map((a) => `${a.name} (${PEOPLE_ROLES[a.role]}, “${a.title}”)`).join("; ")}. The Scientific Committee checks clashes when allotting slots.</p>}
        {reopen && data && (
          <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">{data.session.revisionStatus === "SUBMITTED" ? "Your changes are with the Scientific Committee" : "The Scientific Committee has asked for changes"}</p>
            <p className="mt-1">“{data.session.revisionNote}”</p>
            <p className="mt-1 text-xs">Make the changes below and submit{data.session.editGrantUntil ? ` by ${fmtDateTime(data.session.editGrantUntil)}` : ""}. {data.session.revisionStatus === "SUBMITTED" ? "You can still adjust them until then. " : ""}The website keeps showing the approved version until the Scientific Committee approves your changes; the updated flyer then comes to you for approval.</p>
          </div>
        )}
        {data?.session.originalAgenda && <div className="mb-4"><OriginalAgenda data={data.session.originalAgenda as any} at={data.session.originalSubmittedAt} slots={ev.sessionSlots} /></div>}
        <SessionProposalForm {...common} init={init} readOnly={block} />
      </>
    );
  }

  return (
    <>
      <PageTitle title={`Scientific sessions · ${deptName}`} sub={ev.sciLockAt ? `Departments may edit their agenda until ${fmtDateTime(ev.sciLockAt)}. After the deadline your submission is locked and only the Scientific Committee can edit and finalise it. Your original submission is kept on record.` : "Submit your department's session programme details."}
        actions={!locked && <Link href="/admin/dept/sessions?new=1" className="a-btn-red">+ New session</Link>} />
      <DeptSwitcher list={deptsWith(u.depts, "dept.sessions")} current={deptName} back="/admin/dept/sessions" />
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{searchParams.saved === "changes" ? "Your changes were sent to the Scientific Committee. The website keeps the approved version until they approve them." : "Saved. The Scientific Committee will allot the venue and slot."}</p>}
      {!released && <p className="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">Venue and slot allocation stays confidential to the Scientific Committee until the programme is formally released.</p>}
      <div className="space-y-4">
        {rows.map((r) => {
          const sl = slotOf(ev.sessionSlots, r.slotKey);
          const reopen = revisionOpen(r);
          return (
            <div key={r.id} className="a-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-display text-lg font-bold text-slate-900">{r.title}</p>
                  <p className="text-sm text-slate-500">{SESSION_FORMATS[r.sessionFormat ?? ""]} · {r.expectedAudience} expected · day, time slot and venue allotted by the Scientific Committee</p>
                  {released && r.status === "APPROVED" && sl && <p className="mt-1 text-sm font-semibold text-emerald-700">Scheduled: {slotLabel(sl)} · {r.venue?.name}</p>}</div>
                <div className="flex items-center gap-2">{r.status === "DRAFT" ? <span className="badge bg-amber-100 text-amber-800">To complete</span> : <WpStatus s={released || r.status === "SUBMITTED" || r.status === "REJECTED" ? r.status : "UNDER_REVIEW"} />}<Link href={`/admin/dept/sessions?edit=${r.id}`} className={(r.status === "DRAFT" && !locked) || (reopen && r.revisionStatus === "RETURNED") ? "a-btn-red py-1.5 text-xs" : "a-btn-ghost py-1.5 text-xs"}>{reopen ? (r.revisionStatus === "RETURNED" ? "Make changes" : "Edit changes") : locked || flyerLocked(r) ? "View" : r.status === "DRAFT" ? "Complete details" : "Edit"}</Link></div>
              </div>
              {/* 26 Nov 2026 (LNH): a rejected session shows as Rejected to the department at once, with the committee's note */}
              {r.status === "REJECTED" && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800"><b>Rejected by the Scientific Committee</b>{r.reviewedAt ? ` on ${fmtDateTime(r.reviewedAt)}` : ""}{r.reviewNote ? `: “${r.reviewNote}”` : "."}</p>}
              {reopen && <p className={r.revisionStatus === "RETURNED" ? "mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" : "mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900"}>
                {r.revisionStatus === "RETURNED" ? <><b>Changes requested by the Scientific Committee</b>{r.editGrantUntil ? ` (by ${fmtDateTime(r.editGrantUntil)})` : ""}: “{r.revisionNote}”</> : <><b>Your changes are waiting for Scientific Committee approval.</b> The website shows the approved version until then.</>}</p>}
              <ul className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">{r.people.filter((p) => p.inviteStatus !== "WITHDRAWN").sort((a, b) => a.order - b.order).map((p) => <li key={p.id}><span className="text-slate-400">{PEOPLE_ROLES[p.role]}:</span> {p.name}{p.topic ? ` · ${p.topic}` : ""}</li>)}</ul>
            </div>
          );
        })}
        {!rows.length && <p className="a-card p-10 text-center text-sm text-slate-400">No sessions yet. {!locked && <Link href="/admin/dept/sessions?new=1" className="text-lnh-blue underline">Submit your first session</Link>}</p>}
      </div>
    </>
  );
}
