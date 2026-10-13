"use client";
import { useState } from "react";
import { CreditCard } from "lucide-react";

export function PayButton({ token, amount }: { token: string; amount: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function pay() {
    setBusy(true); setErr(null);
    const r = await fetch(`/api/pay/${token}`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || "Could not start payment"); setBusy(false); return; }
    if (j.kind === "redirect") window.location.href = j.url;
    else if (j.kind === "form") {
      const f = document.createElement("form"); f.method = "POST"; f.action = j.action;
      for (const [k, v] of Object.entries(j.fields as Record<string, string>)) { const i = document.createElement("input"); i.type = "hidden"; i.name = k; i.value = v; f.appendChild(i); }
      document.body.appendChild(f); f.submit();
    } else { setErr("Please pay by bank transfer using the details below."); setBusy(false); }
  }
  return (
    <div>
      <button onClick={pay} className="btn-primary" disabled={busy}><CreditCard className="h-4 w-4" />{busy ? "Redirecting…" : `Pay ${amount} online`}</button>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
