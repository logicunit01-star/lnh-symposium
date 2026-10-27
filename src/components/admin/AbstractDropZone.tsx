"use client";
import { useRef, useState } from "react";
import { GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type A = { refNo: string; title: string; author: string; dept: string | null };

/** Drag accepted oral abstracts into the session (or click +). Submits the same "add by ID" server action. */
export function AbstractDropZone({ action, available, ownDept }: { action: (f: FormData) => void; available: A[]; ownDept: string | null }) {
  const form = useRef<HTMLFormElement>(null);
  const refs = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const add = (ref: string) => { if (!refs.current || !form.current) return; setBusy(ref); refs.current.value = ref; form.current.requestSubmit(); };
  const sorted = [...available].sort((a, b) => Number(b.dept === ownDept) - Number(a.dept === ownDept) || a.refNo.localeCompare(b.refNo));
  return (
    <div className="mt-4">
      <form ref={form} action={action}><input ref={refs} type="hidden" name="refs" /></form>
      <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const r = e.dataTransfer.getData("text/plain"); if (r) add(r); }}
        className={cn("rounded-xl border-2 border-dashed px-4 py-3 text-center text-xs transition", over ? "border-lnh-blue bg-lnh-blue/5 text-lnh-blue" : "border-slate-300 text-slate-500")}>
        {busy ? `Adding ${busy}…` : "Drop an abstract here to add it to this session"}
      </div>
      {sorted.length > 0 ? (
        <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto pr-1">{sorted.map((a) => (
          <li key={a.refNo} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", a.refNo)}
            className="flex cursor-grab items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs hover:border-lnh-blue active:cursor-grabbing">
            <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
            <span className="min-w-0 flex-1"><span className="font-mono font-semibold text-lnh-blue">{a.refNo}</span> <span className="text-slate-700">{a.title}</span>
              <span className="block truncate text-slate-400">{a.author}{a.dept ? ` · ${a.dept}` : ""}</span></span>
            <button type="button" onClick={() => add(a.refNo)} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-lnh-blue" aria-label={`Add ${a.refNo}`}><Plus className="h-4 w-4" /></button>
          </li>
        ))}</ul>
      ) : <p className="mt-2 text-xs text-slate-400">No unassigned accepted oral abstracts.</p>}
    </div>
  );
}
