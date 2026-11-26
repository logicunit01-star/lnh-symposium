import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, isNull, ne } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getEvent } from "@/lib/event";
import { acceptedOralFor, alsoAppearsIn, describeProposal, editRule, flyerLocked, proposalInit, revisionOpen, slotOf, templateFiles } from "@/lib/programme";
import { PageTitle } from "@/components/admin/ui";
import { WpStatus } from "@/components/admin/wp";
import { SessionProposalForm } from "@/components/admin/SessionProposalForm";
import { INVITE_LABEL, PEOPLE_ROLES, SESSION_FORMATS, slotLabel } from "@/lib/scientific";
import { cn, fmtDateTime } from "@/lib/utils";
import { AbstractDropZone } from "@/components/admin/AbstractDropZone";
import { acceptRevision, allotSession, attachAbstracts, decideSession, detachAbstract, discardRevision, resendFlyer, returnToDept } from "../actions";
import { OriginalAgenda } from "@/components/admin/OriginalAgenda";

const SC_BUILDINGS = ["Convention Center", "College of Nursing", "BSMT", "LNMC", "Radiology"];

export default async function ProgrammeSession({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string; err?: string; with?: string; bad?: string; msg?: string } }) {
  const u = await requirePerm("programme");
  const ev = await getEvent();
  const data = await proposalInit(params.id);
  if (!data || !data.session.proposal) notFound();
  const ses = data.session;
  const [rooms, history, also, depts] = await Promise.all([
    db.select().from(s.venues).where(and(eq(s.venues.active, true), ne(s.venues.usage, "WORKSHOP"))).orderBy(asc(s.venues.building), asc(s.venues.name)),
    db.select().from(s.sessionReviews).where(eq(s.sessionReviews.sessionId, ses.id)).orderBy(desc(s.sessionReviews.createdAt)),
    alsoAppearsIn(ses.id),
    db.select({ name: s.departments.name }).from(s.departments).orderBy(asc(s.departments.name)),
  ]);
  const sl = slotOf(ev.sessionSlots, ses.slotKey);
  const afterLock = (!!ev.sciLockAt && new Date() > ev.sciLockAt) || ses.locked;
  const fLocked = flyerLocked(ses);
  const block = can(u, "programme.edit") ? editRule({ role: u.role, isDept: false, ownDept: true, lockAt: ev.sciLockAt, locked: ses.locked, flyerLocked: fLocked }) : "Read only for your role.";
  const special = ses.sessionFormat === "PLENARY" || ses.sessionFormat === "DEBATE";
  const errMsg = searchParams.err === "room" ? `That room is already booked in this slot for “${searchParams.with}”.` : searchParams.err === "allot" ? "Choose a slot and a room." : searchParams.err === "unallotted" ? "Allot a slot and a venue before approving." : searchParams.err === "locked" ? (block ?? "Locked.") : searchParams.err === "draft" ? "The department has not completed this session yet." : searchParams.err === "special" ? "The plenary and debate slots are reserved for those two sessions; speciality sessions use the other slots."
    : searchParams.err === "note" ? "Write what the department should change." : searchParams.err === "return" ? "Only department sessions can be sent back to a department."
    : searchParams.err === "norevision" ? "There are no department changes waiting for approval." : searchParams.err === "revision" ? `The department's changes could not be applied: ${searchParams.msg ?? ""}` : null;
  // 26 Nov 2026: sent back to the HOD for changes
  const rev = ses.revisionStatus;
  const revOpen = revisionOpen(ses);
  const changes = rev === "SUBMITTED" && ses.revisionData ? (() => { const a = describeProposal(data.init as any, SESSION_FORMATS), b = describeProposal(ses.revisionData as any, SESSION_FORMATS); return a.map(([k, v], i) => [k, v, b[i][1]] as const).filter(([, x, y]) => x !== y); })() : [];
  const canReturn = can(u, "programme.edit") && !special && !!ses.department && ses.status !== "DRAFT" && (!fLocked || ["SC_CHAIR", "SUPER_ADMIN"].includes(u.role));
  const people = ses.people.sort((a, b) => a.order - b.order);
  const prefer = new Set(ses.preferredSlots);

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/programme" className="text-lnh-blue hover:underline">← Scientific programme</Link></p>
      <PageTitle title={ses.title} sub={`${ses.department} · ${SESSION_FORMATS[ses.sessionFormat ?? ""]}${ses.formatOther ? ` (${ses.formatOther})` : ""} · ${ses.expectedAudience} expected`} />
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{searchParams.saved === "returned" ? "Sent back to the department. The HOD has been emailed; the website keeps the approved version." : searchParams.saved === "accepted" ? "The department's changes are approved and live. The updated flyer went to the HOD for final approval." : searchParams.saved === "discarded" ? "Done. The approved version stays as it is." : "Saved."}</p>}
      {errMsg && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{errMsg}</p>}
      {!errMsg && block && can(u, "programme.edit") && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{block}</p>}
      {searchParams.bad && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">Not added (not an accepted oral abstract): {searchParams.bad}</p>}
      {also.length > 0 && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">People also in other sessions: {also.map((a) => `${a.name} → “${a.title}”${a.slotKey ? ` (${slotOf(ev.sessionSlots, a.slotKey) ? slotLabel(slotOf(ev.sessionSlots, a.slotKey)!) : a.slotKey})` : ""}`).join("; ")}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {rev === "RETURNED" && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
              <p className="font-semibold">Sent back to the department for changes{ses.revisionBy ? ` by ${ses.revisionBy}` : ""}{ses.revisionAt ? `, ${fmtDateTime(ses.revisionAt)}` : ""}</p>
              <p className="mt-1">“{ses.revisionNote}”</p>
              <p className="mt-1 text-xs">{revOpen ? `The HOD can edit until ${ses.editGrantUntil ? fmtDateTime(ses.editGrantUntil) : "the committee closes the request"}.` : "The time for changes has ended without a submission."} The website shows the approved version meanwhile.</p>
              {can(u, "programme.edit") && <form action={discardRevision.bind(null, ses.id)} className="mt-3"><button className="a-btn-ghost py-1.5 text-xs">Withdraw the request</button></form>}
            </div>
          )}
          {rev === "SUBMITTED" && (
            <div className="rounded-2xl border border-sky-300 bg-sky-50 p-5 text-sm text-slate-800">
              <p className="font-semibold text-sky-900">The department submitted changes{ses.revisionBy ? ` (${ses.revisionBy}` : ""}{ses.revisionAt ? `, ${fmtDateTime(ses.revisionAt)})` : ses.revisionBy ? ")" : ""}</p>
              <p className="mt-1 text-xs text-slate-600">Your note: “{ses.revisionNote}”. The website shows the approved version until the changes are approved.</p>
              {changes.length ? (
                <table className="a-table mt-3 bg-white"><thead><tr><th>Field</th><th>Now on the website</th><th>Proposed by the department</th></tr></thead>
                  <tbody>{changes.map(([k, a, b]) => <tr key={k}><td className="font-semibold">{k}</td><td className="whitespace-pre-line text-slate-500">{a || "—"}</td><td className="whitespace-pre-line font-medium text-slate-900">{b || "—"}</td></tr>)}</tbody></table>
              ) : <p className="mt-3 text-slate-600">No differences from the approved version.</p>}
              <div className="mt-4 flex flex-wrap items-start gap-3">
                {can(u, "programme.approve") && <form action={acceptRevision.bind(null, ses.id)} className="flex flex-wrap gap-2"><input name="note" placeholder="Note (optional)" className="a-input w-56 py-1.5 text-xs" /><button className="a-btn bg-emerald-600 py-1.5 text-xs text-white hover:bg-emerald-700">Approve changes</button></form>}
                {can(u, "programme.edit") && <form action={discardRevision.bind(null, ses.id)}><button className="a-btn-ghost py-1.5 text-xs">Don't accept: keep the approved version</button></form>}
              </div>
              {!can(u, "programme.approve") && <p className="mt-2 text-xs text-slate-500">Approving the changes is for the Scientific Committee Chair or Super Admin.</p>}
            </div>
          )}
          <div className="a-card p-5">
            <div className="flex flex-wrap items-center gap-3"><WpStatus s={ses.status} locked={afterLock} />
              {sl ? <span className="text-sm font-semibold text-slate-800">{slotLabel(sl)} · {ses.venue?.name ?? ses.hall}</span> : <span className="text-sm text-amber-700">No slot or venue yet</span>}
              {afterLock && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">Locked after deadline · Scientific Committee edits only</span>}
              {fLocked && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Flyer approved by HOD · SC Chairperson edits only</span>}</div>
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
                {can(u, "programme.edit") && !block && <form action={detachAbstract.bind(null, a.id, ses.id)}><button className="text-xs text-rose-600 hover:underline">Remove</button></form>}</li>
            ))}{!ses.abstracts.length && <li className="py-2 text-slate-400">None yet.</li>}</ul>
            {can(u, "programme.edit") && !block && (
              <form action={attachAbstracts.bind(null, ses.id)} className="mt-3 flex gap-2"><input name="refs" placeholder="Add by abstract ID, e.g. ABS-2027-0001, ABS-2027-0005" className="a-input font-mono text-xs" list="oral-ids" /><button className="a-btn-primary">Add</button>
                <datalist id="oral-ids">{(await acceptedOralFor(null)).map((a) => <option key={a.refNo} value={a.refNo}>{a.title}</option>)}</datalist></form>
            )}
            {can(u, "programme.edit") && !block && (
              <AbstractDropZone action={attachAbstracts.bind(null, ses.id)} ownDept={ses.department}
                available={(await db.select({ refNo: s.abstracts.refNo, title: s.abstracts.abstractTitle, author: s.abstracts.presentingAuthor, dept: s.abstracts.assignedDept })
                  .from(s.abstracts).where(and(eq(s.abstracts.status, "ACCEPTED"), eq(s.abstracts.acceptedAs, "ORAL"), isNull(s.abstracts.sessionId))))} />
            )}
          </div>

          {ses.originalAgenda && <OriginalAgenda data={ses.originalAgenda as any} at={ses.originalSubmittedAt} slots={ev.sessionSlots} />}

          <details className="a-card p-5">
            <summary className="cursor-pointer font-semibold">Programme details form{block ? " (read only)" : " (edit)"}</summary>
            <div className="mt-4"><SessionProposalForm slots={ev.sessionSlots} departments={depts.map((d) => d.name)} fixedDept={null} templates={ev.agendaTemplates} templateFiles={await templateFiles()} acceptedOral={await acceptedOralFor(ses.department)} init={data.init} readOnly={block} /></div>
          </details>
        </div>

        <aside className="space-y-6">
          {can(u, "programme.edit") && (
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
          {canReturn && rev !== "RETURNED" && (
            <form action={returnToDept.bind(null, ses.id)} className="a-card space-y-2 p-5">
              <p className="font-semibold">{rev === "SUBMITTED" ? "Send back again" : "Send back to the HOD for changes"}</p>
              <p className="text-xs text-slate-500">The HOD can edit this session until the deadline. Their changes go live only after the Scientific Committee approves them; the website keeps the approved version meanwhile.</p>
              <textarea name="note" rows={3} required placeholder="What should the department change?" className="a-input" />
              <label className="flex items-center gap-2 text-sm text-slate-600">Time for changes
                <select name="days" defaultValue="3" className="a-input w-auto py-1.5">{[1, 2, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}</select></label>
              <button className="a-btn-primary w-full">Send back to the HOD</button>
            </form>
          )}
          {can(u, "programme.approve") && (
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
          {!special && ses.status === "APPROVED" && (
            <div className="a-card space-y-2 p-5">
              <p className="font-semibold">Session flyer · final approval by HOD</p>
              <p className="text-xs text-slate-500">Content approval (above) and final flyer approval (department HOD) are separate steps. Once the HOD approves, the flyer is locked; only the Scientific Sessions Chairperson can make changes.</p>
              <p className="text-sm"><span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", ses.flyerStatus === "APPROVED" ? "bg-emerald-100 text-emerald-800" : ses.flyerStatus === "CHANGES" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800")}>{ses.flyerStatus === "APPROVED" ? "Approved and locked" : ses.flyerStatus === "CHANGES" ? "HOD asked for changes" : "Waiting for HOD approval"}</span></p>
              {ses.flyerReviewedAt && <p className="text-xs text-slate-500">{ses.flyerReviewedBy}, {fmtDateTime(ses.flyerReviewedAt)}{ses.flyerNote ? ` · “${ses.flyerNote}”` : ""}</p>}
              <a href={`/sessions/${ses.slug}/flyer`} target="_blank" className="a-btn-ghost w-full">Open flyer (PDF)</a>
              {ses.flyerStatus === "CHANGES" && can(u, "programme.edit") && <form action={resendFlyer.bind(null, ses.id)}><button className="a-btn-primary w-full">Send updated flyer to the HOD</button></form>}
            </div>
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
