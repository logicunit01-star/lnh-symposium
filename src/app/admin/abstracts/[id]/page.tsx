import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageTitle, StatusBadge } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/utils";
import { reviewAbstract } from "../../actions";

export default async function AbstractDetail({ params }: { params: { id: string } }) {
  const u = await requirePerm("abstracts");
  const a = await db.query.abstracts.findFirst({ where: eq(s.abstracts.id, params.id), with: { reviewer: true } });
  if (!a) notFound();
  const reviewers = await db.select({ id: s.users.id, name: s.users.name }).from(s.users).where(inArray(s.users.role, ["SUPER_ADMIN", "ADMIN", "SCIENTIFIC_COMMITTEE"]));
  return (
    <>
      <PageTitle title={a.abstractTitle} sub={`${a.refNo} · ${a.type === "ORAL" ? "Scientific paper (oral)" : "Poster"} · submitted ${fmtDateTime(a.createdAt)}`} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <article className="a-card p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Authors</p>
            <p className="mt-1 text-sm">{a.authors}</p>
            <p className="mt-1 text-xs text-slate-500">Presenting: <b>{a.presentingAuthor}</b></p>
            <div className="mt-5 whitespace-pre-wrap border-t border-slate-100 pt-5 text-[15px] leading-relaxed text-slate-800">{a.body}</div>
            <p className="mt-5 text-xs text-slate-500">{a.wordCount} words{a.keywords ? ` · Keywords: ${a.keywords}` : ""}</p>
          </article>
          <div className="a-card p-6">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {[["Corresponding", `${a.title} ${a.firstName} ${a.lastName}`], ["Gender", a.gender], ["Profession", a.profession], ["Organization", a.organization], ["Department", a.department], ["City / Country", `${a.city}, ${a.country}`], ["Email", a.email], ["Mobile", a.mobile], ["Telephone", a.telephone], ["Qualification", [a.qualification, a.qualificationYear].filter(Boolean).join(", ")], ["Specialty", a.specialty]].map(([k, v]) => (
                <div key={k as string}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium">{v || "—"}</dd></div>
              ))}
            </dl>
          </div>
        </div>
        <div>
          <div className="a-card p-5">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold">Review</p><StatusBadge s={a.status} /></div>
            {a.reviewer && <p className="mt-1 text-xs text-slate-500">Reviewer: {a.reviewer.name}</p>}
            {can(u.role, "abstracts.review") ? (
              <form action={reviewAbstract.bind(null, a.id)} className="mt-4 space-y-3">
                <div><label className="a-label">Decision</label><select name="status" defaultValue={a.status} className="a-input">{["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "REVISION"].map((x) => <option key={x}>{x}</option>)}</select></div>
                <div><label className="a-label">Score (0–100)</label><input name="score" type="number" min={0} max={100} defaultValue={a.score ?? ""} className="a-input" /></div>
                <div><label className="a-label">Assign reviewer</label><select name="reviewerId" defaultValue={a.reviewerId ?? u.sub} className="a-input">{reviewers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
                <div><label className="a-label">Reviewer notes (internal)</label><textarea name="reviewerNotes" rows={5} defaultValue={a.reviewerNotes ?? ""} className="a-input" /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="notify" /> Email decision to author</label>
                <button className="a-btn-primary w-full">Save review</button>
              </form>
            ) : <p className="mt-3 text-sm text-slate-600">{a.reviewerNotes || "No notes"}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
