"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ScanLine } from "lucide-react";

export function ScanInput({ initial }: { initial: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, [initial]);
  return (
    <form className="a-card flex gap-3 p-4" onSubmit={(e) => { e.preventDefault(); router.push(`/admin/checkin?q=${encodeURIComponent(ref.current!.value)}`); }}>
      <div className="relative flex-1">
        <ScanLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input ref={ref} defaultValue={initial} className="a-input py-3 pl-11 text-base" placeholder="Scan QR or type LNH27-0001 / name / phone…" autoComplete="off" />
      </div>
      <button className="a-btn-primary px-6">Find</button>
    </form>
  );
}
