import { and, asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireDept } from "@/lib/dept";
import { getEvent } from "@/lib/event";
import { reviewWindow } from "@/lib/abstracts";
import { PageTitle } from "@/components/admin/ui";
import { SCORE_CRITERIA, SECTIONS, PREF_LABEL, KIND_LABEL, HOD_DECISION_LABEL, decisionsFor } from "@/lib/scientific";
import { cn, fmtDateTime } from "@/lib/utils";
import { deptDecide, deptSubmit } from "../actions";

export const metadata = { title: "Abstract review" };

export default async function DeptAbstracts({ searchParams }: { searchParams: { saved?: string; err?: string; sent?: string } }) {
  const { dept, deptName } = await requireDept("dept.abstracts");
  const ev = await getEvent();
  const w = reviewWindow(ev);
  const rows = await db.select().from(s.abstracts).where(eq(s.abstracts.assignedDept, deptName)).orderBy(asc(s.abstracts.phase), asc(s.abstracts.refNo));
  const activePhase = w.p1 && !dept?.p1SubmittedAt ? 1 : w.p2 && dept?.p2Required && !dept?.p2SubmittedAt ? 2 : null;
  const open = rows.filter((r) => r.status === "SUBMITTED" && r.phase === activePhase);
  const decided = open.filter((r) => r.hodDecision).length;
  const lists = {
    "Accepted as oral": rows.filter((r) => (r.status === "ACCEPTED" && r.acceptedAs === "ORAL") || (r.status !== "ACCEPTED" && r.status !== "SUBMITTED" && r.hodDecision === "ACCEPT_ORAL")),
    "Accepted as poster": rows.filter((r) => (r.status === "ACCEPTED" && r.acceptedAs === "POSTER") || (r.status !== "ACCEPTED" && r.status !== "SUBMITTED" && r.hodDecision === "ACCEPT_POSTER")),
    "Rejected": rows.filter((r) => r.status === "REJECTED" || (r.status === "UNDER_REVIEW" && r.hodDecision === "REJECT")),
    "Returned to secretariat": rows.filter((r) => r.status === "BACK"),
  };
  const msg = searchParams.err === "incomplete" ? "Decide every abstract before sending them to the secretariat." : searchParams.err === "score" ? "Score all five criteria (1 to 5)." : searchParams.err === "decision" ? "Choose a decision." : null;

  return (
    <>
      <PageTitle title={`Abstract review · ${deptName}`} sub={`Phase 1: ${ev.abstractP1Open ? fmtDateTime(ev.abstractP1Open) : "—"} to ${ev.abstractP1Close ? fmtDateTime(ev.abstractP1Close) : "—"} · Phase 2 (reassigned abstracts): ${ev.abstractP2Open ? fmtDateTime(ev.abstractP2Open) : "—"} to ${ev.abstractP2Close ? fmtDateTime(ev.abstractP2Close) : "—"}`} />
      {msg && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{msg}</p>}
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved {searchParams.saved}.</p>}
      {searchParams.sent && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Decisions sent to the symposium secretariat. You can still see the accepted and rejected lists below.</p>}

      {activePhase ? (
        <div className="a-card mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div><p className="text-xs font-bold uppercase tracking-wider text-lnh-red">Phase {activePhase} open</p>
            <p className="font-display text-xl font-bold text-slate-900">{decided} of {open.length} decided</p>
            <p className="text-sm text-slate-500">After sending, this department can no longer change decisions; it keeps read-only access to the lists.</p></div>
          <form action={deptSubmit.bind(null, activePhase)}><button disabled={!open.length || decided < open.length} className="a-btn-red">Send decisions to secretariat</button></form>
        </div>
      ) : (
        <p className="mb-6 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
          {dept?.p1SubmittedAt ? `Phase 1 decisions sent ${fmtDateTime(dept.p1SubmittedAt)}. ` : ""}{dept?.p2SubmittedAt ? `Phase 2 decisions sent ${fmtDateTime(dept.p2SubmittedAt)}. ` : ""}The review portal is not open for this department right now; the lists below are read-only.
        </p>
      )}

      {activePhase && (
        <div className="space-y-4">
          {open.map((a) => (
            <details key={a.id} id={`a-${a.id}`} className="a-card group scroll-mt-6 p-5" open={!a.hodDecision || searchParams.saved === a.refNo}>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
                <span><span className="font-mono text-xs font-semibold text-lnh-blue">{a.refNo}</span>{a.phase === 2 && <span className="ml-2 rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">PHASE 2</span>}
                  <span className="block font-medium text-slate-900">{a.abstractTitle}</span>
                  <span className="text-xs text-slate-500">{PREF_LABEL[a.presentationPref ?? "ORAL"]} · {KIND_LABEL[a.kind ?? "ORIGINAL"]} · {a.presentingAuthor}, {a.organization}</span></span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", a.hodDecision ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800")}>{a.hodDecision ? `${HOD_DECISION_LABEL[a.hodDecision]} · ${a.hodTotal}/25` : "To review"}</span>
              </summary>
              <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
                <article className="space-y-3 text-sm leading-relaxed text-slate-700">
                  <p className="text-xs text-slate-500">Authors: {a.presentingAuthor} (presenting); {(a.coAuthors ?? []).map((c) => `${c.name} (${c.affiliation})`).join("; ")}</p>
                  {(SECTIONS[a.kind ?? "ORIGINAL"] ?? []).map(([k, label]) => a.sections?.[k] ? <p key={k}><b className="text-slate-900">{label}.</b> {a.sections[k]}</p> : null)}
                  {!a.sections && <p className="whitespace-pre-wrap">{a.body}</p>}
                  <p className="text-xs text-slate-500">{a.wordCount} words · Keywords: {a.keywords}</p>
                </article>
                <form action={deptDecide.bind(null, a.id)} className="space-y-3 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Scoring sheet</p>
                  {SCORE_CRITERIA.map(([k, label]) => (
                    <div key={k} className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-700">{label}</span>
                      <select name={`sc_${k}`} defaultValue={a.hodScores?.[k] ?? ""} className="a-input w-16 py-1"><option value="">–</option>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></div>
                  ))}
                  <p className="pt-1 text-xs font-bold uppercase tracking-wider text-slate-500">Decision</p>
                  <div className="grid gap-1.5">{decisionsFor(a.presentationPref).map((d) => (
                    <label key={d} className="flex items-center gap-2 text-sm"><input type="radio" name="decision" value={d} defaultChecked={a.hodDecision === d} />{HOD_DECISION_LABEL[d]}</label>
                  ))}</div>
                  <textarea name="notes" rows={2} defaultValue={a.hodNotes ?? ""} placeholder="Comments for the Scientific Committee (optional)" className="a-input" />
                  <button className="a-btn-primary w-full">Save decision</button>
                </form>
              </div>
            </details>
          ))}
          {!open.length && <p className="a-card p-8 text-center text-sm text-slate-400">No abstracts waiting for this phase.</p>}
        </div>
      )}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {Object.entries(lists).map(([label, list]) => (
          <div key={label} className="a-card p-5">
            <h2 className="font-display text-base font-bold">{label} <span className="text-slate-400">({list.length})</span></h2>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {list.map((a) => <li key={a.id} className="py-2"><span className="font-mono text-xs text-lnh-blue">{a.refNo}</span> {a.abstractTitle}<span className="block text-xs text-slate-400">{a.presentingAuthor} · {a.status === "ACCEPTED" || a.status === "REJECTED" ? "final" : "awaiting Scientific Committee"}</span></li>)}
              {!list.length && <li className="py-2 text-slate-400">None</li>}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
