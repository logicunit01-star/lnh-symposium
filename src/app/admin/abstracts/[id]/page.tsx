import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageTitle, StatusBadge } from "@/components/admin/ui";
import { HOD_DECISION_LABEL, KIND_LABEL, PREF_LABEL, SCORE_CRITERIA, SECTIONS } from "@/lib/scientific";
import { fmtDateTime } from "@/lib/utils";
import { assignAbstractVenue, scFinalize, scReassign } from "../actions";

export default async function AbstractDetail({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string } }) {
  const u = await requirePerm("abstracts");
  const a = await db.query.abstracts.findFirst({ where: eq(s.abstracts.id, params.id), with: { session: true, events: { orderBy: desc(s.abstractEvents.createdAt) } } });
  if (!a) notFound();
  const depts = await db.select({ name: s.departments.name }).from(s.departments).orderBy(asc(s.departments.name));
  const venues = await db.select({ id: s.venues.id, name: s.venues.name, building: s.venues.building, active: s.venues.active }).from(s.venues).orderBy(asc(s.venues.building), asc(s.venues.name));
  const review = can(u.role, "abstracts.review");
  const suggested = a.hodDecision === "ACCEPT_ORAL" ? "ORAL" : a.hodDecision === "ACCEPT_POSTER" ? "POSTER" : a.hodDecision === "REJECT" ? "REJECT" : "";
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/abstracts" className="text-lnh-blue hover:underline">← Abstracts</Link></p>
      <PageTitle title={a.abstractTitle} sub={`${a.refNo} · ${PREF_LABEL[a.presentationPref ?? ""] ?? a.type} · ${KIND_LABEL[a.kind ?? ""] ?? "Abstract"} · ${a.specialty} · submitted ${fmtDateTime(a.createdAt)}`} />
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved.</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <article className="a-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Authors</p>
            <p className="mt-1 text-sm"><b>{a.presentingAuthor}</b> (presenting), {a.designation}, {a.organization}</p>
            <ol className="mt-1 list-decimal pl-5 text-sm text-slate-600">{(a.coAuthors ?? []).map((c, i) => <li key={i}>{c.name}: {c.affiliation}</li>)}</ol>
            <div className="mt-5 space-y-3 border-t border-slate-100 pt-5 text-[15px] leading-relaxed text-slate-800">
              {a.sections ? (SECTIONS[a.kind ?? "ORIGINAL"] ?? []).map(([k, label]) => a.sections?.[k] ? <p key={k}><b>{label}.</b> {a.sections[k]}</p> : null) : <p className="whitespace-pre-wrap">{a.body}</p>}
            </div>
            <p className="mt-5 text-xs text-slate-500">{a.wordCount} words · Keywords: {a.keywords || "—"}</p>
          </article>
          <div className="a-card p-6">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {[["Department", a.department], ["City / Country", `${a.city}, ${a.country}`], ["Email", a.email], ["Contact", a.mobile], ["Reviewing department", `${a.assignedDept ?? a.specialty} (Phase ${a.phase})`], ["Session", a.session?.title], ["Venue", venues.find((v) => v.id === a.venueId)?.name], ["Placement", a.placement]].map(([k, v]) => (
                <div key={k as string}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium">{v || "—"}</dd></div>
              ))}
            </dl>
          </div>
          <div className="a-card p-6">
            <p className="text-sm font-semibold">History</p>
            <ol className="mt-3 space-y-2 border-l border-slate-200 pl-4 text-sm">{a.events.map((e) => <li key={e.id}><b className="text-slate-700">{e.action}</b>{e.note && <span className="text-slate-500"> · {e.note}</span>}<span className="block text-xs text-slate-400">{e.actor} · {fmtDateTime(e.createdAt)}</span></li>)}</ol>
          </div>
        </div>
        <div className="space-y-6">
          <div className="a-card p-5">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold">Department review</p><StatusBadge s={a.status} /></div>
            {a.hodDecision ? (
              <>
                <p className="mt-2 font-display text-lg font-bold">{HOD_DECISION_LABEL[a.hodDecision]} <span className="text-slate-400">{a.hodTotal}/25</span></p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">{SCORE_CRITERIA.map(([k, l]) => <li key={k} className="flex justify-between"><span>{l}</span><b>{a.hodScores?.[k] ?? "—"}</b></li>)}</ul>
                {a.hodNotes && <p className="mt-2 text-sm text-slate-600">“{a.hodNotes}”</p>}
                <p className="mt-2 text-xs text-slate-400">{a.hodBy} · {a.hodAt ? fmtDateTime(a.hodAt) : ""}</p>
              </>
            ) : <p className="mt-2 text-sm text-slate-500">Not yet decided by {a.assignedDept ?? a.specialty}.</p>}
          </div>
          {review && (
            <form action={scFinalize.bind(null, a.id)} className="a-card space-y-3 p-5">
              <p className="text-sm font-semibold">Scientific Committee decision</p>
              <div className="grid gap-1.5 text-sm">{[["ORAL", "Accept as oral"], ["POSTER", "Accept as poster"], ["REJECT", "Reject"]].map(([v, l]) => (
                <label key={v} className="flex items-center gap-2"><input type="radio" name="final" value={v} defaultChecked={(a.acceptedAs ?? (a.status === "REJECTED" ? "REJECT" : suggested)) === v} />{l}{suggested === v && <span className="text-[10px] font-bold text-slate-400">department's choice</span>}</label>
              ))}</div>
              <textarea name="scNotes" rows={2} defaultValue={a.scNotes ?? ""} placeholder="Quality check notes (internal)" className="a-input" />
              <button className="a-btn-primary w-full">Save final decision</button>
              {a.authorNotifiedAt && <p className="text-xs text-slate-500">Author notified {fmtDateTime(a.authorNotifiedAt)}</p>}
            </form>
          )}
          {review && a.status === "ACCEPTED" && (
            <form action={assignAbstractVenue.bind(null, a.id)} className="a-card space-y-3 p-5">
              <p className="text-sm font-semibold">Venue and placement</p>
              <select name="venueId" defaultValue={a.venueId ?? ""} className="a-input"><option value="">No venue yet</option>{venues.filter((v) => v.active || v.id === a.venueId).map((v) => <option key={v.id} value={v.id}>{v.name} · {v.building}</option>)}</select>
              <input name="placement" defaultValue={a.placement ?? ""} maxLength={200} placeholder={a.acceptedAs === "POSTER" ? "Poster board no., display day / time" : "Slot, order, remarks"} className="a-input" />
              <button className="a-btn-ghost w-full">Save venue</button>
              {can(u.role, "venues") && <Link href="/admin/venues" className="block text-center text-xs text-lnh-blue hover:underline">Add or update venues</Link>}
            </form>
          )}
          {review && (
            <form action={scReassign.bind(null, a.id)} className="a-card space-y-3 p-5">
              <p className="text-sm font-semibold">Reassign to a department (Phase 2)</p>
              <p className="text-xs text-slate-500">Opens a short Phase 2 window for that department to decide this abstract.</p>
              <select name="dept" defaultValue="" className="a-input"><option value="" disabled>Choose department…</option>{depts.map((d) => <option key={d.name}>{d.name}</option>)}</select>
              <input name="note" placeholder="Reason (optional)" className="a-input" />
              <button className="a-btn-ghost w-full">Reassign</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
