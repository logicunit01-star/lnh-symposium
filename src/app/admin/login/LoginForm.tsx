"use client";
import { useState } from "react";

export function LoginForm({ next }: { next?: string }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr(null);
      const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))) });
      if (r.ok) window.location.href = next?.startsWith("/admin") ? next : "/admin";
      else { setErr((await r.json().catch(() => ({}))).error || "Sign-in failed"); setBusy(false); }
    }}>
      {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>}
      <div><label className="a-label" htmlFor="email">Email</label><input id="email" name="email" type="email" className="a-input" required autoFocus /></div>
      <div><label className="a-label" htmlFor="password">Password</label><input id="password" name="password" type="password" className="a-input" required /></div>
      <button className="a-btn-primary w-full py-2.5" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
