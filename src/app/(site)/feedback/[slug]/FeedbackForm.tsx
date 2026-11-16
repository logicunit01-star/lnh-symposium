"use client";
import { useState } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { useSubmit } from "@/components/ui/useForm";
import { Alert } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

const Q = [
  ["overall", "Overall, how would you rate this session?"],
  ["content", "Quality of content"],
  ["speaker", "Speaker(s) / facilitator(s)"],
  ["relevance", "Relevance to your practice"],
  ["organization", "Organization, timing & venue"],
] as const;

const SYMPOSIUM_Q = [
  ["overall", "Overall, how would you rate the symposium?"],
  ["content", "Scientific content of the sessions"],
  ["speaker", "Speakers and moderators"],
  ["relevance", "Relevance to your practice"],
  ["organization", "Organisation, registration, timing and venue"],
] as const;

/** Session feedback; with `symposium` (16 Nov 2026, item 5) the overall symposium feedback, tied to the registration. */
export function FeedbackForm({ slug, symposium }: { slug: string; symposium?: { token?: string } }) {
  const QS = symposium ? SYMPOSIUM_Q : Q;
  const [v, setV] = useState<Record<string, number>>({});
  const [rec, setRec] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const { submit, loading, error } = useSubmit(symposium ? "/api/feedback/symposium" : `/api/feedback/${slug}`);
  if (done) return <div className="py-8 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" /><p className="h-display mt-5 text-3xl text-white">Thank you!</p><p className="mt-2 text-slate-400">Your feedback helps us improve.</p></div>;
  const complete = QS.every(([k]) => v[k]) && rec !== null;
  return (
    <form className="space-y-7" onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const r = await submit({ ...v, recommend: rec, comments: fd.get("comments"), regNo: fd.get("regNo") || undefined, email: fd.get("email") || undefined, token: symposium?.token });
      if (r) setDone(true);
    }}>
      {error && <Alert>{error}</Alert>}
      {QS.map(([k, label]) => (
        <div key={k}>
          <p className="mb-3 text-sm font-medium text-white">{label}</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} aria-label={`${n} star`} onClick={() => setV((p) => ({ ...p, [k]: n }))}
                className={cn("grid h-12 flex-1 place-items-center rounded-xl border transition", (v[k] ?? 0) >= n ? "border-lnh-gold/50 bg-lnh-gold/15 text-lnh-gold" : "border-white/10 text-slate-600 hover:border-white/30")}>
                <Star className={cn("h-5 w-5", (v[k] ?? 0) >= n && "fill-current")} />
              </button>
            ))}
          </div>
        </div>
      ))}
      <div>
        <p className="mb-3 text-sm font-medium text-white">{symposium ? "Would you recommend the LNH Symposium to a colleague?" : "Would you recommend this session to a colleague?"}</p>
        <div className="flex gap-2">{[true, false].map((b) => (
          <button type="button" key={String(b)} onClick={() => setRec(b)} className={cn("flex-1 rounded-xl border py-3 text-sm font-semibold transition", rec === b ? "border-lnh-sky bg-lnh-sky/15 text-white" : "border-white/10 text-slate-400")}>{b ? "Yes" : "No"}</button>
        ))}</div>
      </div>
      <div><label className="label" htmlFor="comments">Comments (optional)</label><textarea id="comments" name="comments" rows={3} className="input" /></div>
      {!symposium && <div><label className="label" htmlFor="regNo">Registration no. (optional)</label><input id="regNo" name="regNo" className="input uppercase" placeholder="LNH27-0001" /></div>}
      {symposium && !symposium.token && <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="regNo">Registration no. <span className="text-lnh-red">*</span></label><input id="regNo" name="regNo" required className="input uppercase" placeholder="SYM-2027-00012" /></div>
        <div><label className="label" htmlFor="email">Registered email <span className="text-lnh-red">*</span></label><input id="email" name="email" type="email" required className="input" /></div></div>}
      <button className="btn-primary w-full" disabled={!complete || loading}>{loading ? "Submitting…" : "Submit feedback"}</button>
    </form>
  );
}
