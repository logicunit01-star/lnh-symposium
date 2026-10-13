"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AgendaTabs({ tabs, panels }: { tabs: { key: string; label: string; sub: string }[]; panels: React.ReactNode[] }) {
  const [i, setI] = useState(0);
  return (
    <div>
      <div role="tablist" className="sticky top-20 z-20 -mx-4 mb-10 flex gap-2 overflow-x-auto bg-ink/80 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-full sm:border sm:border-white/10 sm:p-2">
        {tabs.map((t, k) => (
          <button key={t.key} role="tab" aria-selected={i === k} onClick={() => setI(k)}
            className={cn("shrink-0 rounded-full px-6 py-3 text-left transition", i === k ? "bg-lnh-red text-white shadow-[0_8px_30px_-8px_#D2192E]" : "text-slate-300 hover:bg-white/5")}>
            <span className="block font-display text-sm font-bold uppercase">{t.label}</span>
            <span className={cn("block text-[11px]", i === k ? "text-white/80" : "text-slate-500")}>{t.sub}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel">{panels[i]}</div>
    </div>
  );
}
