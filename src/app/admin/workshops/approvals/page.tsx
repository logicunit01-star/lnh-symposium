import Link from "next/link";
import { requirePerm, staffScope } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { CATEGORY_LABEL, wpWorkshops } from "@/lib/wp";
import { PageTitle } from "@/components/admin/ui";
import { WpStatus, WpTabs } from "@/components/admin/wp";
import { fmtDate, fmtDateTime, pkr } from "@/lib/utils";
import { reviewWorkshop } from "../actions";

export const metadata = { title: "Workshop approvals" };

export default async function Approvals() {
  const u = await requirePerm("workshops");
  const sc = await staffScope(u);
  const all = await wpWorkshops(sc);
  const queue = all.filter((r) => r.w.status === "SUBMITTED" || r.w.status === "UNDER_REVIEW").sort((a, b) => +(a.w.submittedAt ?? a.w.createdAt) - +(b.w.submittedAt ?? b.w.createdAt));
  const decided = all.filter((r) => r.w.reviewedAt).sort((a, b) => +b.w.reviewedAt! - +a.w.reviewedAt!).slice(0, 10);
  const canReview = can(u.role, "workshops.review"), canMark = can(u.role, "workshops.edit");

  return (
    <>
      <PageTitle title="Workshop Programme" sub="Approvals queue, oldest first. Approving publishes the workshop to the catalogue and locks its core fields." />
      <WpTabs active="approvals" pending={queue.length} canSubmit={can(u.role, "workshops.submit")} canVenues={can(u.role, "venues")} canCheckin={can(u.role, "checkin")} />
      <div className="space-y-4">
        {queue.map((r) => (
          <article key={r.w.id} className="a-card grid gap-4 p-5 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="flex flex-wrap items-center gap-2"><WpStatus s={r.w.status} />{r.clash && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">Venue/time clash</span>}
                <span className="text-xs text-slate-400">submitted {r.w.submittedAt ? fmtDateTime(r.w.submittedAt) : "—"}</span></div>
              <h2 className="mt-2 font-display text-lg font-bold text-slate-900"><Link href={`/admin/workshops/${r.w.id}`} className="hover:text-lnh-blue">{r.w.title}</Link></h2>
              <p className="text-sm text-slate-500">{r.w.department}{r.w.category ? ` · ${CATEGORY_LABEL[r.w.category]}` : ""}{r.w.leadFaculty ? ` · Lead: ${r.w.leadFaculty}` : ""}</p>
              <p className="mt-2 font-mono text-xs text-slate-600">{fmtDate(r.w.startsAt, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })} · {r.time} · {r.venue?.name ?? r.w.hall} · cap {r.w.capacity} · {pkr(r.w.fee)} · {r.w.cmeHours ?? "—"} CME</p>
              <p className="mt-1 text-xs text-slate-500">{r.w.facilitators} facilitators, {r.w.volunteers} volunteers, {r.w.technicians} technicians · {r.w.equipment.length} equipment lines</p>
              {r.w.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{r.w.description}</p>}
            </div>
            {(canReview || canMark) ? (
              <form action={reviewWorkshop.bind(null, r.w.id)} className="space-y-2">
                <textarea name="note" rows={2} placeholder="Note (required to reject)" className="a-input" />
                <div className="flex flex-wrap gap-2">
                  {r.w.status !== "UNDER_REVIEW" && <button name="status" value="UNDER_REVIEW" className="a-btn border border-orange-300 bg-orange-50 text-orange-700">Under review</button>}
                  {canReview && <button name="status" value="APPROVED" className="a-btn bg-emerald-600 text-white hover:bg-emerald-700">Approve</button>}
                  {canReview && <button name="status" value="REJECTED" className="a-btn bg-rose-600 text-white hover:bg-rose-700">Reject</button>}
                </div>
              </form>
            ) : <p className="text-sm text-slate-500">Awaiting committee review.</p>}
          </article>
        ))}
        {!queue.length && <div className="a-card px-4 py-12 text-center text-sm text-slate-400">No requests waiting. {can(u.role, "workshops.submit") && <Link className="text-lnh-blue underline" href="/admin/workshops/new">Submit one</Link>}</div>}
      </div>

      {decided.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 font-display text-lg font-bold">Recently decided</h2>
          <div className="a-card overflow-x-auto"><table className="a-table">
            <thead><tr><th>Workshop</th><th>Decision</th><th>When</th><th>Note</th></tr></thead>
            <tbody>{decided.map((r) => (
              <tr key={r.w.id}><td><Link href={`/admin/workshops/${r.w.id}`} className="font-medium hover:text-lnh-blue">{r.w.title}</Link></td><td><WpStatus s={r.w.status} locked={r.w.locked} /></td>
                <td className="whitespace-nowrap text-xs text-slate-500">{fmtDateTime(r.w.reviewedAt!)}</td><td className="text-xs text-slate-500">{r.w.reviewNote ?? "—"}</td></tr>
            ))}</tbody>
          </table></div>
        </>
      )}
    </>
  );
}
