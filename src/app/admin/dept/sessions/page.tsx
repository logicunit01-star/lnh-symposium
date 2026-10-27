import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireDept } from "@/lib/dept";
import { getEvent } from "@/lib/event";
import { acceptedOralFor, alsoAppearsIn, editRule, proposalInit, slotOf, templateFiles } from "@/lib/programme";
import { PageTitle } from "@/components/admin/ui";
import { WpStatus } from "@/components/admin/wp";
import { SessionProposalForm } from "@/components/admin/SessionProposalForm";
import { PEOPLE_ROLES, SESSION_FORMATS, slotLabel } from "@/lib/scientific";
import { fmtDateTime } from "@/lib/utils";

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
    const block = data ? editRule({ role: u.role, isDept: true, ownDept: true, lockAt: ev.sciLockAt, locked: data.session.locked, editGrantUntil: data.session.editGrantUntil }) : locked ? "The agenda deadline has passed. Contact the symposium secretariat." : null;
    const also = data ? await alsoAppearsIn(data.session.id) : [];
    return (
      <>
        <p className="mb-2 text-sm"><Link href="/admin/dept/sessions" className="text-lnh-blue hover:underline">← Sessions</Link></p>
        <PageTitle title={data ? `Edit: ${data.session.title}` : "Scientific Sessions' Program Details"} sub={`${ev.name} · ${ev.mainTheme}`} />
        {also.length > 0 && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Also in other sessions: {also.map((a) => `${a.name} (${PEOPLE_ROLES[a.role]}, “${a.title}”)`).join("; ")}. The Scientific Committee checks clashes when allotting slots.</p>}
        <SessionProposalForm {...common} init={data?.init} readOnly={block} />
      </>
    );
  }

  return (
    <>
      <PageTitle title={`Scientific sessions · ${deptName}`} sub={ev.sciLockAt ? `Departments may edit their agenda until ${fmtDateTime(ev.sciLockAt)}. After that, changes need Scientific Committee Chair approval.` : "Submit your department's session programme details."}
        actions={!locked && <Link href="/admin/dept/sessions?new=1" className="a-btn-red">+ New session</Link>} />
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved. The Scientific Committee will allot the venue and slot.</p>}
      {!released && <p className="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">Venue and slot allocation stays confidential to the Scientific Committee until the programme is formally released.</p>}
      <div className="space-y-4">
        {rows.map((r) => {
          const sl = slotOf(ev.sessionSlots, r.slotKey);
          return (
            <div key={r.id} className="a-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-display text-lg font-bold text-slate-900">{r.title}</p>
                  <p className="text-sm text-slate-500">{SESSION_FORMATS[r.sessionFormat ?? ""]} · {r.expectedAudience} expected · preferred {r.preferredSlots.map((k) => { const x = slotOf(ev.sessionSlots, k); return x ? slotLabel(x) : k; }).join(" / ")}</p>
                  {released && r.status === "APPROVED" && sl && <p className="mt-1 text-sm font-semibold text-emerald-700">Scheduled: {slotLabel(sl)} · {r.venue?.name}</p>}</div>
                <div className="flex items-center gap-2">{r.status === "DRAFT" ? <span className="badge bg-amber-100 text-amber-800">To complete</span> : <WpStatus s={released || r.status === "SUBMITTED" ? r.status : "UNDER_REVIEW"} />}<Link href={`/admin/dept/sessions?edit=${r.id}`} className={r.status === "DRAFT" && !locked ? "a-btn-red py-1.5 text-xs" : "a-btn-ghost py-1.5 text-xs"}>{locked ? "View" : r.status === "DRAFT" ? "Complete details" : "Edit"}</Link></div>
              </div>
              <ul className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">{r.people.filter((p) => p.inviteStatus !== "WITHDRAWN").sort((a, b) => a.order - b.order).map((p) => <li key={p.id}><span className="text-slate-400">{PEOPLE_ROLES[p.role]}:</span> {p.name}{p.topic ? ` · ${p.topic}` : ""}</li>)}</ul>
            </div>
          );
        })}
        {!rows.length && <p className="a-card p-10 text-center text-sm text-slate-400">No sessions yet. {!locked && <Link href="/admin/dept/sessions?new=1" className="text-lnh-blue underline">Submit your first session</Link>}</p>}
      </div>
    </>
  );
}
