"use client";
import { useEffect, useState } from "react";

/** Shows a bulk message batch going out; outside the LNH server it also drives the sending in steps. */
export function BatchProgress({ batch }: { batch: string }) {
  const [c, setC] = useState<{ waiting: number; sent: number; failed: number; logged: number; worker: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let stop = false;
    const step = async () => {
      try {
        const r = await fetch("/api/admin/outbox/drain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ref: batch }) });
        const j = await r.json();
        if (!r.ok) { setErr(j.error || "Could not check the batch"); return; }
        if (stop) return;
        setC(j);
        if (j.waiting > 0) setTimeout(step, j.worker ? 4000 : 300);
      } catch { if (!stop) setTimeout(step, 4000); }
    };
    void step();
    return () => { stop = true; };
  }, [batch]);
  if (err) return <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{err}</p>;
  if (!c) return <p className="mb-4 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-800">Preparing to send…</p>;
  const total = c.waiting + c.sent + c.failed + c.logged;
  return (
    <div className="mb-4 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900" aria-live="polite">
      {c.waiting > 0 ? <>Sending… {c.sent + c.failed + c.logged} of {total} done. {c.worker ? "The sender continues even if you close this page." : "Keep this page open until it finishes."}</>
        : <>Finished: {c.sent} sent{c.logged ? `, ${c.logged} recorded only (no mailbox / SMS gateway)` : ""}{c.failed ? `, ${c.failed} not delivered yet (retried automatically; see WhatsApp & SMS → Queue)` : ""}.</>}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-100"><div className="h-full bg-lnh-blue transition-all" style={{ width: `${total ? ((total - c.waiting) / total) * 100 : 100}%` }} /></div>
    </div>
  );
}
