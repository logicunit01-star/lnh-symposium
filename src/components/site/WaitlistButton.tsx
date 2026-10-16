"use client";
import { useState } from "react";
import { Hourglass } from "lucide-react";

export function WaitlistButton({ sessionId, slug }: { sessionId: string; slug: string }) {
  const [state, setState] = useState<{ busy?: boolean; pos?: number; err?: string }>({});
  async function join() {
    setState({ busy: true });
    const r = await fetch("/api/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId }) });
    if (r.status === 401) { window.location.href = `/account?next=${encodeURIComponent(`/workshops#${slug}`)}`; return; }
    const j = await r.json().catch(() => ({}));
    setState(r.ok ? { pos: j.position } : { err: j.error ?? "Could not join the waitlist." });
  }
  if (state.pos) return <span className="rounded-full border border-lnh-gold/40 bg-lnh-gold/10 px-3 py-2 text-xs font-semibold text-lnh-gold">On waitlist · #{state.pos}</span>;
  return (
    <div className="text-right">
      <button onClick={join} disabled={state.busy} className="inline-flex items-center gap-1.5 rounded-full border border-lnh-gold/50 px-3 py-2 text-xs font-semibold text-lnh-gold transition hover:bg-lnh-gold/10 disabled:opacity-50">
        <Hourglass className="h-3.5 w-3.5" />{state.busy ? "Joining…" : "Join waitlist"}
      </button>
      {state.err && <p className="mt-1 text-[11px] text-lnh-rose">{state.err}</p>}
    </div>
  );
}
