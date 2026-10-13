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

export function FeedbackForm({ slug }: { slug: string }) {
  const [v, setV] = useState<Record<string, number>>({});
  const [rec, setRec] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const { submit, loading, error } = useSubmit(`/api/feedback/${slug}`);
  if (done) return <div className="py-8 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" /><p className="h-display mt-5 text-3xl text-white">Thank you!</p><p className="mt-2 text-slate-400">Your feedback helps us improve.</p></div>;
  const complete = Q.every(([k]) => v[k]) && rec !== null;
  return (
    <form className="space-y-7" onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const r = await submit({ ...v, recommend: rec, comments: fd.get("comments"), regNo: fd.get("regNo") || undefined });
      if (r) setDone(true);
    }}>
      {error && <Alert>{error}</Alert>}
      {Q.map(([k, label]) => (
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
        <p className="mb-3 text-sm font-medium text-white">Would you recommend this session to a colleague?</p>
        <div className="flex gap-2">{[true, false].map((b) => (
          <button type="button" key={String(b)} onClick={() => setRec(b)} className={cn("flex-1 rounded-xl border py-3 text-sm font-semibold transition", rec === b ? "border-lnh-sky bg-lnh-sky/15 text-white" : "border-white/10 text-slate-400")}>{b ? "Yes" : "No"}</button>
        ))}</div>
      </div>
      <div><label className="label" htmlFor="comments">Comments (optional)</label><textarea id="comments" name="comments" rows={3} className="input" /></div>
      <div><label className="label" htmlFor="regNo">Registration no. (optional)</label><input id="regNo" name="regNo" className="input uppercase" placeholder="LNH27-0001" /></div>
      <button className="btn-primary w-full" disabled={!complete || loading}>{loading ? "Submitting…" : "Submit feedback"}</button>
    </form>
  );
}
