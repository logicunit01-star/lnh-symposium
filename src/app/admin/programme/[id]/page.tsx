import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getEvent } from "@/lib/event";
import { acceptedOralFor, alsoAppearsIn, editRule, proposalInit, slotOf, templateFiles } from "@/lib/programme";
import { PageTitle } from "@/components/admin/ui";
import { WpStatus } from "@/components/admin/wp";
import { SessionProposalForm } from "@/components/admin/SessionProposalForm";
import { INVITE_LABEL, PEOPLE_ROLES, SESSION_FORMATS, slotLabel } from "@/lib/scientific";
import { cn, fmtDateTime } from "@/lib/utils";
import { AbstractDropZone } from "@/components/admin/AbstractDropZone";
import { allotSession, attachAbstracts, decideSession, detachAbstract, grantEdit } from "../actions";

const SC_BUILDINGS = ["Convention Center", "College of Nursing", "BSMT", "LNMC", "Radiology"];

export default async function ProgrammeSession({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string; err?: string; with?: string; bad?: string } }) {
  const u = await requirePerm("programme");
  const ev = await getEvent();
  const data = await proposalInit(params.id);
  if (!data || !data.session.proposal) notFound();
  const ses = data.session;
  const [rooms, history, also, depts] = await Promise.all([
    db.select().from(s.venues).where(eq(s.venues.active, true)).orderBy(asc(s.venues.building), asc(s.venues.name)),
    db.select().from(s.sessionReviews).where(eq(s.sessionReviews.sessionId, ses.id)).orderBy(desc(s.sessionReviews.createdAt)),
    alsoAppearsIn(ses.id),
    db.select({ name: s.departments.name }).from(s.departments).orderBy(asc(s.departments.name)),
  ]);
  const sl = slotOf(ev.sessionSlots, ses.slotKey);
  const afterLock = (!!ev.sciLockAt && new Date() > ev.sciLockAt) || ses.locked;
  const block = can(u.role, "programme.edit") ? editRule({ role: u.role, isDept: false, ownDept: true, lockAt: ev.sciLockAt, locked: ses.locked, editGrantUntil: ses.editGrantUntil }) : "Read only for your role.";
  const errMsg = searchParams.err === "room" ? `That room is already booked in this slot for “${searchParams.with}”.` : searchParams.err === "allot" ? "Choose a slot and a room." : searchParams.err === "unallotted" ? "Allot a slot and a venue before approving." : searchParams.err === "locked" ? "Locked: the Scientific Committee Chair must authorise changes." : searchParams.err === "draft" ? "The department has not completed this session yet." : searchParams.err === "special" ? "The plenary and debate slots are reserved for those two sessions; speciality sessions use the other slots." : null;
  const people = ses.people.sort((a, b) => a.order - b.order);
  const prefer = new Set(ses.preferredSlots);

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/programme" className="text-lnh-blue hover:underline">← Scientific programme</Link></p>
      <PageTitle title={ses.title} sub={`${ses.department} · ${SESSION_FORMATS[ses.sessionFormat ?? ""]}${ses.formatOther ? ` (${ses.formatOther})` : ""} · ${ses.expectedAudience} expected`} />
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved.</p>}
      {errMsg && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{errMsg}</p>}
      {searchParams.bad && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Not added (not an accepted oral abstract): {searchParams.bad}</p>}
      {also.length > 0 && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">People also in other sessions: {also.map((a) => `${a.name} → “${a.title}”${a.slotKey ? ` (${slotOf(ev.sessionSlots, a.slotKey) ? slotLabel(slotOf(ev.sessionSlots, a.slotKey)!) : a.slotKey})` : ""}`).join("; ")}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="a-card p-5">
            <div className="flex flex-wrap items-center gap-3"><WpStatus s={ses.status} locked={afterLock} />
              {sl ? <span className="text-sm font-semibold text-slate-800">{slotLabel(sl)} · {ses.venue?.name ?? ses.hall}</span> : <span className="text-sm text-amber-700">No slot or venue yet</span>}
              {ses.editGrantUntil && ses.editGrantUntil > new Date() && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Secretariat may edit until {fmtDateTime(ses.editGrantUntil)}</span>}</div>
            <ul className="mt-4 divide-y divide-slate-100 text-sm">
              {people.map((p) => (
                <li key={p.id} className={cn("flex flex-wrap items-start justify-between gap-2 py-2", p.inviteStatus === "WITHDRAWN" && "opacity-50")}>
                  <span><span className="text-xs font-semibold uppercase text-slate-400">{PEOPLE_ROLES[p.role]}{p.timeSlot ? ` · ${p.timeSlot}` : ""}</span><span className="block font-medium text-slate-800">{p.name}</span>
                    <span className="text-xs text-slate-500">{[p.designation, p.affiliation, p.email, p.phone].filter(Boolean).join(" · ")}</span>{p.topic && <span className="block text-xs text-slate-600">“{p.topic}”</span>}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{INVITE_LABEL[p.inviteStatus]}</span>
                </li>
              ))}
            </ul>
          </div>

          <div id="abstracts" className="a-card p-5">
            <p className="font-semibold">Accepted oral abstracts in this session</p>
            <ul className="mt-2 divide-y divide-slate-100 text-sm">{ses.abstracts.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 py-2"><span><span className="font-mono text-xs text-lnh-blue">{a.refNo}</span> {a.abstractTitle}<span className="block text-xs text-slate-400">{a.presentingAuthor}</span></span>
                {can(u.role, "programme.edit") && !block && <form action={detachAbstract.bind(null, a.id, ses.id)}><button className="text-xs text-rose-600 hover:underline">Remove</button></form>}</li>
            ))}{!ses.abstracts.length && <li className="py-2 text-slate-400">None yet.</li>}</ul>
            {can(u.role, "programme.edit") && !block && (
              <form action={attachAbstracts.bind(null, ses.id)} className="mt-3 flex gap-2"><input name="refs" placeholder="Add by abstract ID, e.g. ABS-2027-0001, ABS-2027-0005" className="a-input font-mono text-xs" list="oral-ids" /><button className="a-btn-primary">Add</button>
                <datalist id="oral-ids">{(await acceptedOralFor(null)).map((a) => <option key={a.refNo} value={a.refNo}>{a.title}</option>)}</datalist></form>
            )}
            {can(u.role, "programme.edit") && !block && (
              <AbstractDropZone action={attachAbstracts.bind(null, ses.id)} ownDept={ses.department}
                available={(await db.select({ refNo: s.abstracts.refNo, title: s.abstracts.abstractTitle, author: s.abstracts.presentingAuthor, dept: s.abstracts.assignedDept })
                  .from(s.abstracts).where(and(eq(s.abstracts.status, "ACCEPTED"), eq(s.abstracts.acceptedAs, "ORAL"), isNull(s.abstracts.sessionId))))} />
            )}
          </div>

          <details className="a-card p-5">
            <summary className="cursor-pointer font-semibold">Programme details form{block ? " (read only)" : " (edit)"}</summary>
            <div className="mt-4"><SessionProposalForm slots={ev.sessionSlots} departments={depts.map((d) => d.name)} fixedDept={null} templates={ev.agendaTemplates} templateFiles={await templateFiles()} acceptedOral={await acceptedOralFor(ses.department)} init={data.init} readOnly={block} /></div>
          </details>
        </div>

        <aside className="space-y-6">
          {can(u.role, "programme.edit") && (
            <form action={allotSession.bind(null, ses.id)} className="a-card space-y-3 p-5">
              <p className="font-semibold">Allot slot and venue</p>
              <select name="slotKey" defaultValue={ses.slotKey ?? ses.preferredSlots[0] ?? ""} className="a-input">
                {ev.sessionSlots.map((x) => <option key={x.key} value={x.key}>{prefer.has(x.key) ? "★ " : ""}{slotLabel(x)}</option>)}
              </select>
              <select name="venueId" defaultValue={ses.venueId ?? ""} className="a-input"><option value="">Choose room…</option>
                {rooms.filter((v) => SC_BUILDINGS.includes(v.building)).map((v) => <option key={v.id} value={v.id}>{v.name} · {v.capacity}{(ses.expectedAudience ?? 0) > v.capacity ? " (too small)" : ""}</option>)}</select>
              <p className="text-xs text-slate-500">★ = department's preferred slots. Rooms already booked in the slot are refused.</p>
              <button disabled={!!block} className="a-btn-primary w-full">Save allotment</button>
            </form>
          )}
          {can(u.role, "programme.approve") && (
            <form action={decideSession.bind(null, ses.id)} className="a-card space-y-2 p-5">
              <p className="font-semibold">Scientific Committee decision</p>
              <textarea name="note" rows={2} placeholder="Note to the department (optional)" className="a-input" />
              <div className="grid gap-2">
                <button name="status" value="UNDER_REVIEW" className="a-btn border border-orange-300 bg-orange-50 text-orange-700">Under review</button>
                <button name="status" value="APPROVED" className="a-btn bg-emerald-600 text-white hover:bg-emerald-700">Approve</button>
                <button name="status" value="REJECTED" className="a-btn bg-rose-600 text-white hover:bg-rose-700">Reject</button>
              </div>
            </form>
          )}
          {can(u.role, "programme.approve") && afterLock && (
            <form action={grantEdit.bind(null, ses.id)} className="a-card space-y-2 p-5">
              <p className="font-semibold">Authorise a change after lock</p>
              <p className="text-xs text-slate-500">Lets the secretariat edit this session for 48 hours. Logged in the history.</p>
              <input name="note" placeholder="What is changing" className="a-input" />
              <button className="a-btn-ghost w-full">Authorise secretariat edit</button>
            </form>
          )}
          <div className="a-card p-5">
            <p className="font-semibold">History</p>
            <ol className="mt-3 space-y-2 border-l border-slate-200 pl-4 text-sm">{history.map((h) => <li key={h.id}><b className="text-slate-700">{h.toStatus.replace("_", " ")}</b>{h.note && <span className="text-slate-500"> · {h.note}</span>}<span className="block text-xs text-slate-400">{h.userName} · {fmtDateTime(h.createdAt)}</span></li>)}</ol>
          </div>
        </aside>
      </div>
    </>
  );
}
