import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { CheckCircle2, ExternalLink, MessageSquareWarning } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import { cn, fmtDate, fmtDateTime, fmtTime24 } from "@/lib/utils";
import { reviewFlyer } from "../workshops/actions";

export const metadata = { title: "Flyer review" };

const LABEL: Record<string, [string, string]> = {
  PENDING: ["Awaiting review", "bg-amber-100 text-amber-800"],
  CHANGES: ["Changes requested", "bg-rose-100 text-rose-700"],
  APPROVED: ["Approved", "bg-emerald-100 text-emerald-800"],
};

/** Marketing department: review the flyer generated for each approved workshop. */
export default async function Flyers({ searchParams }: { searchParams: { w?: string; f?: string; saved?: string; err?: string } }) {
  await requirePerm("flyers");
  const rows = await db.select().from(s.sessions).where(and(eq(s.sessions.type, "WORKSHOP"), eq(s.sessions.status, "APPROVED"))).orderBy(asc(s.sessions.startsAt));
  const filter = ["PENDING", "CHANGES", "APPROVED"].includes(searchParams.f ?? "") ? searchParams.f : null;
  const list = rows.filter((r) => !filter || (r.flyerStatus ?? "PENDING") === filter);
  const sel = rows.find((r) => r.id === searchParams.w) ?? list.find((r) => (r.flyerStatus ?? "PENDING") === "PENDING") ?? list[0];
  const count = (k: string) => rows.filter((r) => (r.flyerStatus ?? "PENDING") === k).length;

  return (
    <>
      <PageTitle title="Flyer review" sub="Each approved workshop gets a flyer on the official 9th LNH Symposium template. Approve it, or send it back with the change needed. Approved flyers become downloadable for the public and the workshop team." />
      <div className="mb-4 flex flex-wrap gap-2">
        {[["", "All", rows.length], ["PENDING", "Awaiting review", count("PENDING")], ["CHANGES", "Changes requested", count("CHANGES")], ["APPROVED", "Approved", count("APPROVED")]].map(([k, l, n]) => (
          <Link key={String(k)} href={`/admin/flyers${k ? `?f=${k}` : ""}`} className={cn("a-btn-ghost py-1.5 text-xs", (filter ?? "") === k && "border-lnh-blue text-lnh-blue")}>{l} <span className="rounded-full bg-slate-100 px-1.5 text-[11px]">{n}</span></Link>
        ))}
      </div>
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{searchParams.saved === "APPROVED" ? "Flyer approved. The workshop team has been emailed the download link." : "Sent back to the workshop committee with your note."}</p>}
      {searchParams.err === "note" && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Say what needs to change before sending a flyer back.</p>}
      {!rows.length ? <div className="a-card p-10 text-center text-sm text-slate-500">No approved workshops yet. Flyers appear here as soon as the Workshop Programme Committee approves a workshop.</div> : (
        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <div className="a-card divide-y divide-slate-100 self-start">
            {list.map((r) => {
              const [l, c] = LABEL[r.flyerStatus ?? "PENDING"];
              return (
                <Link key={r.id} href={`/admin/flyers?w=${r.id}${filter ? `&f=${filter}` : ""}`} className={cn("block px-4 py-3 hover:bg-slate-50", sel?.id === r.id && "bg-lnh-blue/5")}>
                  <p className="text-sm font-semibold text-slate-800">{r.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{r.department} · {fmtDate(r.startsAt, { day: "numeric", month: "short" })}, {fmtTime24(r.startsAt)}</p>
                  <span className={cn("badge mt-1.5", c)}>{l}</span>
                </Link>
              );
            })}
            {!list.length && <p className="p-4 text-sm text-slate-500">Nothing in this list.</p>}
          </div>
          {sel && (
            <div className="space-y-4">
              <div className="a-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">{sel.title}</h2>
                    <p className="text-sm text-slate-500">{sel.department} · {sel.hall ?? "venue tbc"} · {fmtDate(sel.startsAt, { weekday: "short", day: "numeric", month: "short" })}</p>
                    {sel.flyerReviewedAt && <p className="mt-1 text-xs text-slate-500">Last review: {sel.flyerReviewedBy}, {fmtDateTime(sel.flyerReviewedAt)}{sel.flyerNote ? ` · “${sel.flyerNote}”` : ""}</p>}
                  </div>
                  <a href={`/api/workshops/${sel.slug}/flyer`} target="_blank" className="a-btn-ghost"><ExternalLink className="h-4 w-4" />Open PDF</a>
                </div>
                <form action={reviewFlyer.bind(null, sel.id)} className="mt-4 flex flex-wrap items-end gap-2">
                  <div className="min-w-[260px] flex-1"><label className="a-label">Note to the workshop committee (required when asking for changes)</label><input name="note" className="a-input" placeholder="e.g. Use the full faculty title; shorten the description" /></div>
                  <button name="flyer" value="APPROVED" className="a-btn-primary"><CheckCircle2 className="h-4 w-4" />Approve flyer</button>
                  <button name="flyer" value="CHANGES" className="a-btn-ghost text-rose-600"><MessageSquareWarning className="h-4 w-4" />Request changes</button>
                </form>
              </div>
              <div className="a-card overflow-hidden"><iframe title={`Flyer for ${sel.title}`} src={`/api/workshops/${sel.slug}/flyer#view=FitH`} className="h-[1100px] w-full bg-slate-200" /></div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
