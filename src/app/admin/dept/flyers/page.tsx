import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { CheckCircle2, ExternalLink, Lock, MessageSquareWarning } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { requireDept } from "@/lib/dept";
import { PageTitle } from "@/components/admin/ui";
import { cn, fmtDate, fmtDateTime, fmtTime24 } from "@/lib/utils";
import { hodFlyerDecision } from "../actions";

export const metadata = { title: "Session flyers" };
const LABEL: Record<string, [string, string]> = {
  PENDING: ["Awaiting your approval", "bg-amber-100 text-amber-800"],
  CHANGES: ["Changes requested", "bg-rose-100 text-rose-700"],
  APPROVED: ["Approved and locked", "bg-emerald-100 text-emerald-800"],
};

/** SC feedback (29 Oct 2026): final flyer approval by the department HOD, separate from the Scientific Committee's content approval. */
export default async function DeptFlyers({ searchParams }: { searchParams: { s?: string; saved?: string; err?: string } }) {
  const { deptName } = await requireDept("dept.flyers");
  const rows = await db.select().from(s.sessions).where(and(eq(s.sessions.department, deptName), eq(s.sessions.proposal, true), eq(s.sessions.status, "APPROVED"))).orderBy(asc(s.sessions.startsAt));
  const sel = rows.find((r) => r.id === searchParams.s) ?? rows.find((r) => r.flyerStatus === "PENDING") ?? rows[0];
  return (
    <>
      <PageTitle title={`Session flyers · ${deptName}`} sub="After the Scientific Committee approves your session content, its flyer is generated here for your final approval. Once you approve, the flyer is locked; later changes can be made only through the Scientific Sessions Chairperson." />
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{searchParams.saved === "APPROVED" ? "Flyer approved and locked." : "Sent back to the Scientific Committee with your note."}</p>}
      {searchParams.err === "note" && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Say what needs to change before sending the flyer back.</p>}
      {!rows.length ? <div className="a-card p-10 text-center text-sm text-slate-500">No approved sessions yet. The flyer appears here as soon as the Scientific Committee approves your session.</div> : (
        <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
          <div className="a-card divide-y divide-slate-100 self-start">
            {rows.map((r) => {
              const [l, c] = LABEL[r.flyerStatus ?? "PENDING"];
              return (
                <Link key={r.id} href={`/admin/dept/flyers?s=${r.id}`} className={cn("block px-4 py-3 hover:bg-slate-50", sel?.id === r.id && "bg-lnh-blue/5")}>
                  <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{fmtDate(r.startsAt, { weekday: "short", day: "numeric", month: "short" })}, {fmtTime24(r.startsAt)} · {r.hall ?? "venue tbc"}</p>
                  <span className={cn("badge mt-1.5", c)}>{l}</span>
                </Link>
              );
            })}
          </div>
          {sel && (
            <div className="space-y-4">
              <div className="a-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="font-display text-lg font-bold text-slate-900">{sel.title}</h2>
                    {sel.flyerReviewedAt && <p className="mt-1 text-xs text-slate-500">Last review: {sel.flyerReviewedBy}, {fmtDateTime(sel.flyerReviewedAt)}{sel.flyerNote ? ` · “${sel.flyerNote}”` : ""}</p>}</div>
                  <a href={`/api/sessions/${sel.slug}/flyer`} target="_blank" className="a-btn-ghost"><ExternalLink className="h-4 w-4" />Open PDF</a>
                </div>
                {sel.flyerStatus === "APPROVED" ? <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700"><Lock className="h-4 w-4" />Approved and locked. Contact the Scientific Sessions Chairperson for any change.</p>
                  : sel.flyerStatus === "CHANGES" ? <p className="mt-4 text-sm text-rose-700">You asked for changes. The Scientific Committee will send the updated flyer back to you.</p> : (
                  <form action={hodFlyerDecision.bind(null, sel.id)} className="mt-4 flex flex-wrap items-end gap-2">
                    <div className="min-w-[260px] flex-1"><label className="a-label">Note to the Scientific Committee (required when asking for changes)</label><input name="note" className="a-input" placeholder="e.g. Correct the co-chair's title" /></div>
                    <button name="flyer" value="APPROVED" className="a-btn-primary"><CheckCircle2 className="h-4 w-4" />Approve and lock</button>
                    <button name="flyer" value="CHANGES" className="a-btn-ghost text-rose-600"><MessageSquareWarning className="h-4 w-4" />Request changes</button>
                  </form>
                )}
              </div>
              <div className="a-card overflow-hidden"><iframe title={`Flyer for ${sel.title}`} src={`/api/sessions/${sel.slug}/flyer#view=FitH`} className="h-[1200px] w-full bg-slate-200" /></div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
