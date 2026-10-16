import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { Download, ExternalLink, Lock, Pencil, Users } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { requirePerm, staffScope } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getEvent } from "@/lib/event";
import { CATEGORY_LABEL, DECISION_LABEL, LOW_FILL, wpWorkshops } from "@/lib/wp";
import { PageTitle } from "@/components/admin/ui";
import { Bar, WpStatus, pct } from "@/components/admin/wp";
import { CampusMap } from "@/components/CampusMap";
import { fmtDate, fmtDateTime, pkr } from "@/lib/utils";
import { decideLowFill, deleteWorkshop, notifyWaitlist, reviewWorkshop, unlockWorkshop } from "../actions";

export default async function WorkshopDetail({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string; err?: string; locked?: string } }) {
  const u = await requirePerm("workshops");
  const sc = await staffScope(u);
  const ev = await getEvent();
  const row = (await wpWorkshops(sc)).find((r) => r.w.id === params.id);
  if (!row) notFound();
  const { w, venue } = row;
  const [history, waiting, venues] = await Promise.all([
    db.select().from(s.sessionReviews).where(eq(s.sessionReviews.sessionId, w.id)).orderBy(desc(s.sessionReviews.createdAt)),
    db.select().from(s.waitlist).where(eq(s.waitlist.sessionId, w.id)).orderBy(asc(s.waitlist.createdAt)),
    db.select().from(s.venues),
  ]);
  const own = !sc.all && w.department === sc.department;
  const canEdit = !w.locked && (can(u.role, "workshops.edit") || (own && can(u.role, "workshops.submit")));
  const canReview = can(u.role, "workshops.review");
  const canMark = can(u.role, "workshops.edit");
  const free = w.capacity ? Math.max(0, w.capacity - row.booked) : 0;
  const daysTo = Math.ceil((w.startsAt.getTime() - Date.now()) / 864e5);
  const weekLabel = w.themeWeek ? ev.themeWeeks[w.themeWeek - 1]?.label : null;

  const F = ({ l, v }: { l: string; v: React.ReactNode }) => <div><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{l}</dt><dd className="mt-0.5 text-sm text-slate-800">{v || <span className="text-slate-400">—</span>}</dd></div>;

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/workshops" className="text-lnh-blue hover:underline">← Workshop Programme</Link></p>
      <PageTitle title={w.title} sub={`${w.department ?? ""}${w.category ? ` · ${CATEGORY_LABEL[w.category]}` : ""}${w.themeWeek ? ` · Week ${w.themeWeek}${weekLabel ? ` (${weekLabel})` : ""}` : ""}`}
        actions={<>
          {canEdit && <Link href={`/admin/workshops/${w.id}/edit`} className="a-btn-ghost"><Pencil className="h-4 w-4" />Edit</Link>}
          {w.status === "APPROVED" && <a href={`/api/workshops/${w.slug}/flyer`} className="a-btn-ghost"><Download className="h-4 w-4" />Flyer PDF</a>}
          {w.status === "APPROVED" && <Link href={`/workshops#${w.slug}`} target="_blank" className="a-btn-ghost"><ExternalLink className="h-4 w-4" />Catalogue</Link>}
          {can(u.role, "sessions") && <Link href={`/admin/sessions/${w.id}`} className="a-btn-primary"><Users className="h-4 w-4" />Participants</Link>}
        </>} />

      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved. The committee sees this request in the approvals queue.</p>}
      {searchParams.locked && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">This request is locked after the committee decision, or you cannot edit it.</p>}
      {searchParams.err === "note" && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Give the reason when rejecting a request.</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="a-card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <WpStatus s={w.status} locked={w.locked} />
              {w.locked && <span className="flex items-center gap-1 text-xs text-slate-500"><Lock className="h-3.5 w-3.5" />Core fields locked {w.reviewedAt ? `since ${fmtDateTime(w.reviewedAt)}` : ""}</span>}
              {row.clash && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">Venue/time clash</span>}
              {w.coChairDecision && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Co-Chair decision: {DECISION_LABEL[w.coChairDecision]}</span>}
            </div>
            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              <F l="Date" v={fmtDate(w.startsAt, { weekday: "short", day: "numeric", month: "long", year: "numeric" })} />
              <F l="Time (24h)" v={<span className="font-mono">{row.time}</span>} />
              <F l="Venue" v={venue ? `${venue.name}, ${venue.building}` : w.hall} />
              <F l="Seat cap" v={w.capacity} /><F l="Fee" v={`${pkr(w.fee)}${w.earlyFee != null ? ` (early ${pkr(w.earlyFee)})` : ""}`} /><F l="CME hours" v={w.cmeHours} />
              <F l="Format" v={w.format} /><F l="Contributing departments" v={w.contributors} /><F l="Submitted" v={w.submittedAt ? fmtDateTime(w.submittedAt) : null} />
            </dl>
            {w.description && <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">{w.description}</p>}
          </div>

          <div className="a-card p-5">
            <h2 className="font-display text-base font-bold">Lead faculty</h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-3">
              <F l="Name" v={w.leadFaculty} /><F l="Degrees" v={w.facultyDegrees} /><F l="Contact" v={w.facultyContact} />
            </dl>
            {w.facultyProfile && <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{w.facultyProfile}</p>}
          </div>

          <div className="a-card p-5">
            <h2 className="font-display text-base font-bold">People and equipment</h2>
            <p className="mt-2 text-sm text-slate-600"><b>{w.facilitators}</b> facilitators · <b>{w.volunteers}</b> volunteers · <b>{w.technicians}</b> technicians</p>
            {w.equipment.length > 0 ? (
              <table className="a-table mt-3"><thead><tr><th>Item</th><th>Qty</th><th>Source</th></tr></thead>
                <tbody>{w.equipment.map((e, i) => <tr key={i}><td>{e.item}</td><td>{e.qty}</td><td className="text-slate-500">{e.source}</td></tr>)}</tbody></table>
            ) : <p className="mt-2 text-sm text-slate-400">No equipment listed.</p>}
          </div>

          <div className="a-card p-5">
            <div className="flex items-center justify-between"><h2 className="font-display text-base font-bold">Waitlist ({waiting.length})</h2>
              {canMark && waiting.some((x) => !x.notifiedAt) && free > 0 && <form action={notifyWaitlist.bind(null, w.id)}><button className="a-btn-primary py-1.5 text-xs">Email next {Math.min(free, waiting.filter((x) => !x.notifiedAt).length)}</button></form>}</div>
            {waiting.length ? (
              <ol className="mt-3 divide-y divide-slate-100 text-sm">{waiting.map((x, i) => (
                <li key={x.id} className="flex justify-between py-2"><span>{i + 1}. {x.name} <span className="text-xs text-slate-400">{x.email}</span></span><span className="text-xs text-slate-500">{x.notifiedAt ? `notified ${fmtDateTime(x.notifiedAt)}` : fmtDateTime(x.createdAt)}</span></li>
              ))}</ol>
            ) : <p className="mt-2 text-sm text-slate-400">Nobody is waiting.</p>}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="a-card p-5">
            <h2 className="font-display text-base font-bold">Registrations</h2>
            <p className="mt-2 font-display text-3xl font-bold">{row.booked}<span className="text-base font-medium text-slate-400"> / {w.capacity ?? "∞"}</span></p>
            {w.capacity ? <div className="mt-2"><Bar pct={row.fill} tone={row.fill >= 1 ? "red" : row.fill < LOW_FILL ? "amber" : "blue"} /></div> : null}
            <p className="mt-2 text-xs text-slate-500">{row.confirmed} paid · {row.attended} checked in · {pkr(row.income)} income</p>
            {w.status === "APPROVED" && row.fill < LOW_FILL && daysTo > 0 && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Under {pct(LOW_FILL)} with {daysTo} days to go{daysTo <= 7 ? " — decision due now." : "."}</p>}
            {canReview && w.status === "APPROVED" && (
              <form action={decideLowFill.bind(null, w.id)} className="mt-3 flex flex-wrap gap-1">
                {Object.entries(DECISION_LABEL).map(([v, l]) => <button key={v} name="decision" value={v} className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:border-amber-400">{l}</button>)}
              </form>
            )}
          </div>

          <div id="review" className="a-card scroll-mt-6 p-5">
            <h2 className="font-display text-base font-bold">Committee action</h2>
            {w.locked ? (
              <>
                <p className="mt-2 text-sm text-slate-600">Decided: <WpStatus s={w.status} locked />{w.reviewNote && <span className="mt-2 block text-xs text-slate-500">“{w.reviewNote}”</span>}</p>
                {canReview && (
                  <form action={unlockWorkshop.bind(null, w.id)} className="mt-3 space-y-2">
                    <input name="note" placeholder="Reason for unlocking" className="a-input" />
                    <button className="a-btn-ghost w-full">Unlock for revision</button>
                  </form>
                )}
              </>
            ) : (canReview || canMark) ? (
              <form action={reviewWorkshop.bind(null, w.id)} className="mt-3 space-y-2">
                <textarea name="note" rows={3} placeholder="Note to the Workshop Director (required to reject)" className="a-input" defaultValue={w.reviewNote ?? ""} />
                <div className="grid grid-cols-1 gap-2">
                  {w.status !== "UNDER_REVIEW" && <button name="status" value="UNDER_REVIEW" className="a-btn border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100">Mark under review</button>}
                  {canReview && <button name="status" value="APPROVED" className="a-btn bg-emerald-600 text-white hover:bg-emerald-700">Approve and publish</button>}
                  {canReview && <button name="status" value="REJECTED" className="a-btn bg-rose-600 text-white hover:bg-rose-700">Reject</button>}
                </div>
                {!canReview && <p className="text-xs text-slate-500">Only Co-Chairs can approve or reject.</p>}
              </form>
            ) : <p className="mt-2 text-sm text-slate-500">Waiting for the committee. You will get an email when it is decided.</p>}
          </div>

          {venue && (
            <div className="a-card p-3">
              <CampusMap pins={venues} active={venue.id} className="w-full rounded-lg" />
              <p className="px-2 pt-2 text-xs text-slate-500"><b className="text-slate-700">{venue.name}</b> · {venue.building}{venue.floor ? `, ${venue.floor} floor` : ""} · seats {venue.capacity} · online: {venue.onlineFacility ?? "none"}</p>
            </div>
          )}

          <div className="a-card p-5">
            <h2 className="font-display text-base font-bold">History</h2>
            <ol className="mt-3 space-y-3 border-l border-slate-200 pl-4 text-sm">
              {history.map((h) => (
                <li key={h.id} className="relative"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-lnh-blue ring-2 ring-white" />
                  <p className="font-medium text-slate-700">{h.fromStatus && h.fromStatus !== h.toStatus ? `${h.fromStatus.replace("_", " ")} → ` : ""}{h.toStatus.replace("_", " ")}</p>
                  <p className="text-xs text-slate-500">{h.userName ?? "System"} · {fmtDateTime(h.createdAt)}</p>
                  {h.note && <p className="text-xs text-slate-600">{h.note}</p>}</li>
              ))}
              {!history.length && <li className="text-slate-400">Seeded demo record.</li>}
            </ol>
          </div>

          {(canReview || (own && !w.locked)) && row.booked === 0 && (
            <form action={deleteWorkshop.bind(null, w.id)}><button className="w-full text-center text-xs font-semibold text-rose-600 hover:underline">Withdraw / delete this request</button></form>
          )}
        </aside>
      </div>
    </>
  );
}
