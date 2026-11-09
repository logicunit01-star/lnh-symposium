"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function AgendaTabs({ tabs, panels, initial = 0 }: { tabs: { key: string; label: string; sub: string }[]; panels: React.ReactNode[]; initial?: number }) {
  const [i, setI] = useState(initial);
  return (
    <div>
      <div role="tablist" className="sticky top-20 z-20 -mx-4 mb-10 flex gap-2 overflow-x-auto bg-ink/80 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-full sm:border sm:border-white/10 sm:p-2">
        {tabs.map((t, k) => (
          <button key={t.key} role="tab" aria-selected={i === k} onClick={() => setI(k)}
            aria-controls="agenda-panel" className={cn("shrink-0 rounded-full px-6 py-3 text-left transition", i === k ? "bg-lnh-red text-white shadow-[0_8px_30px_-8px_#B72025]" : "text-slate-300 hover:bg-white/5")}>
            <span className="block font-display text-sm font-bold uppercase">{t.label}</span>
            <span className={cn("block text-xs", i === k ? "text-white/90" : "text-slate-300")}>{t.sub}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" id="agenda-panel">{panels[i]}</div>
    </div>
  );
}
