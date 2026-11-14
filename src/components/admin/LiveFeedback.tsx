"use client";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import type { FeedbackStats } from "@/lib/feedbackStats";
import { WF_NEGATIVE, WF_STATEMENTS } from "@/lib/workshop-feedback";

const DIMS = [["overall", "Overall"], ["content", "Content"], ["speaker", "Speaker(s)"], ["relevance", "Relevance"], ["organization", "Organization"]] as const;

export function LiveFeedback({ sessionId, initial, compact }: { sessionId: string; initial: FeedbackStats; compact?: boolean }) {
  const [d, setD] = useState(initial);
  useEffect(() => {
    const t = setInterval(async () => {
      const r = await fetch(`/api/admin/sessions/${sessionId}/feedback`, { cache: "no-store" });
      if (r.ok) setD(await r.json());
    }, 5000);
    return () => clearInterval(t);
  }, [sessionId]);
  const maxDist = Math.max(1, ...d.dist);
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2"><span className="font-display text-4xl font-bold">{d.overall || "—"}</span><span className="text-sm text-slate-500">/ 5 · {d.n} responses</span></div>
        <span className="flex items-center gap-1.5 text-[11px] text-emerald-600"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Live</span>
      </div>
      <div className="mt-4 grid gap-2">
        {DIMS.map(([k, l]) => (
          <div key={k} className="grid grid-cols-[90px_1fr_36px] items-center gap-2 text-xs">
            <span className="text-slate-500">{l}</span>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-lnh-blue transition-all" style={{ width: `${((d as any)[k] / 5) * 100}%` }} /></div>
            <span className="text-right font-semibold">{(d as any)[k] || "—"}</span>
          </div>
        ))}
      </div>
      {!compact && (
        <>
          <div className="mt-5 flex items-end gap-2">
            {d.dist.map((n, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] text-slate-500">{n}</span>
                <div className="w-full rounded-t bg-lnh-gold/80" style={{ height: `${(n / maxDist) * 70 + 2}px` }} />
                <span className="flex items-center text-[10px] text-slate-500">{i + 1}<Star className="h-2.5 w-2.5" /></span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">Would recommend: <b className="text-slate-800">{d.recommend}%</b></p>
          {d.workshopForm?.statements && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Workshop feedback form · {d.workshopForm.n} responses</p>
              <ol className="mt-2 space-y-1.5">{WF_STATEMENTS.map((t, i) => (
                <li key={i} className="grid grid-cols-[1fr_44px] items-center gap-2 text-xs"><span className="text-slate-600">{i + 1}. {t}{WF_NEGATIVE.includes(i) && <span className="text-slate-400"> (lower is better)</span>}</span><b className="text-right">{d.workshopForm!.statements![i]}</b></li>
              ))}</ol>
              <p className="mt-3 text-xs text-slate-500">Recommend: <b>{d.workshopForm.yes}</b> yes · <b>{d.workshopForm.maybe}</b> maybe · <b>{d.workshopForm.no}</b> no · <b>{d.workshopForm.contact}</b> happy to be contacted</p>
            </div>
          )}
          {d.comments.length > 0 && (
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {d.comments.map((c, i) => <li key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">“{c.c}” <span className="text-xs text-slate-400">— {c.o}★</span></li>)}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
