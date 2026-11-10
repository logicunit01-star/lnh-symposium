"use client";
import { useState } from "react";

/** HOD quality check scoring sheet with a live total (Sadaf, 10 Nov: "add total scoring"; the total is for reference,
 *  each HOD decides the minimum for acceptance). N/A (0) is left out of the maximum. */
export function ScoreSheet({ criteria, options, initial }: { criteria: [string, string][]; options: [string, string][]; initial: Record<string, string> }) {
  const [v, setV] = useState<Record<string, string>>(initial);
  const rated = criteria.map(([k]) => v[k]).filter((x) => x !== undefined && x !== "");
  const applies = rated.filter((x) => x !== "0");
  const total = applies.reduce((a, x) => a + Number(x), 0);
  return (
    <>
      {criteria.map(([k, label]) => (
        <div key={k} className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-700">{label}</span>
          <select name={`sc_${k}`} value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} className="a-input w-32 py-1"><option value="">–</option>{options.map(([o, l]) => <option key={o} value={o}>{l}</option>)}</select></div>
      ))}
      <p className="flex items-baseline justify-between border-t border-slate-200 pt-2 text-sm" aria-live="polite">
        <span className="font-semibold text-slate-700">Total</span>
        <span><b className="font-display text-lg text-slate-900">{total} / {applies.length * 3}</b>
          <span className="ml-1 text-xs text-slate-500">{rated.length < criteria.length ? `${criteria.length - rated.length} still to rate` : rated.length - applies.length ? "N/A not counted" : ""}</span></span>
      </p>
    </>
  );
}
