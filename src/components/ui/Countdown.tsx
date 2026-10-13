"use client";
import { useEffect, useState } from "react";

export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const diff = Math.max(0, new Date(to).getTime() - (now ?? 0));
  const parts = now == null ? [["--", "Days"], ["--", "Hours"], ["--", "Min"], ["--", "Sec"]] : [
    [Math.floor(diff / 864e5), "Days"], [Math.floor(diff / 36e5) % 24, "Hours"], [Math.floor(diff / 6e4) % 60, "Min"], [Math.floor(diff / 1e3) % 60, "Sec"],
  ];
  return (
    <div className="flex gap-2 sm:gap-3" aria-label="Countdown to the symposium">
      {parts.map(([v, l]) => (
        <div key={l as string} className="min-w-[68px] rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center backdrop-blur sm:min-w-[84px]">
          <div className="font-display text-2xl font-bold tabular-nums text-white sm:text-4xl">{typeof v === "number" ? String(v).padStart(2, "0") : v}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">{l}</div>
        </div>
      ))}
    </div>
  );
}
