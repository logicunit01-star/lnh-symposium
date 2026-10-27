"use client";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Alert } from "./Field";

/** 6-digit code entry with paste support, resend timer and the demo-mode code banner. */
export function OtpVerify({ otpId, sentTo, demoCode, verifyUrl, onVerified, onCancel, title = "Verify it's you" }: {
  otpId: string; sentTo: string; demoCode?: string; verifyUrl: string; onVerified: (data: any) => void; onCancel?: () => void; title?: string;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [demo, setDemo] = useState(demoCode);
  const [wait, setWait] = useState(30);
  const [left, setLeft] = useState(300);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => { const r = box.current?.getBoundingClientRect(); if (r) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - 160), behavior: "instant" as ScrollBehavior }); refs.current[0]?.focus({ preventScroll: true }); }, []);
  useEffect(() => { const t = setInterval(() => { setWait((w) => Math.max(0, w - 1)); setLeft((l) => Math.max(0, l - 1)); }, 1000); return () => clearInterval(t); }, []);

  async function check(code: string) {
    setBusy(true); setErr(null);
    const r = await fetch(verifyUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ otpId, code }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error || "Could not verify the code."); setDigits(Array(6).fill("")); refs.current[0]?.focus(); return; }
    onVerified(j);
  }
  function put(i: number, v: string) {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) { // pasted
      const next = clean.slice(0, 6).split("").concat(Array(6).fill("")).slice(0, 6);
      setDigits(next); if (clean.length >= 6) check(clean.slice(0, 6)); else refs.current[clean.length]?.focus(); return;
    }
    const next = [...digits]; next[i] = clean; setDigits(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) check(next.join(""));
  }
  async function resend() {
    setErr(null); setInfo(null);
    const r = await fetch("/api/account/resend", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ otpId }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error || "Could not send a new code."); return; }
    setInfo("A new code is on its way."); setDemo(j.demoCode); setWait(30); setLeft(300); setDigits(Array(6).fill(""));
  }
  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <div ref={box} className="mx-auto max-w-md scroll-mt-32 text-center" role="dialog" aria-labelledby="otp-title">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-lnh-sky/40 bg-lnh-sky/10 text-lnh-sky"><ShieldCheck className="h-7 w-7" /></span>
      <h2 id="otp-title" className="mt-4 font-display text-2xl font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">We sent a 6-digit code to <span className="mono text-white">{sentTo}</span>. It expires in <span className="mono text-white">{mm}</span>.</p>
      {demo && <p className="mx-auto mt-4 w-fit rounded-xl border border-lnh-gold/40 bg-lnh-gold/10 px-4 py-2 text-xs text-lnh-gold">Demo mode (no SMS or email service connected): your code is <b className="mono text-base tracking-[0.3em]">{demo}</b></p>}
      <div className="mt-6 flex justify-center gap-2" onPaste={(e) => { e.preventDefault(); put(0, e.clipboardData.getData("text")); }}>
        {digits.map((d, i) => (
          <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={6} aria-label={`Digit ${i + 1}`}
            onChange={(e) => put(i, e.target.value)} onKeyDown={(e) => { if (e.key === "Backspace" && !d && i > 0) refs.current[i - 1]?.focus(); }}
            className="mono h-14 w-11 rounded-xl border border-white/15 bg-white/5 text-center text-2xl text-white outline-none transition focus:border-lnh-sky focus:ring-2 focus:ring-lnh-sky/30 sm:w-12" disabled={busy} />
        ))}
      </div>
      {err && <Alert className="mt-4">{err}</Alert>}
      {info && <Alert kind="info" className="mt-4">{info}</Alert>}
      <div className="mt-6 flex items-center justify-center gap-4 text-sm">
        <button type="button" onClick={resend} disabled={wait > 0} className="text-lnh-sky hover:underline disabled:text-slate-600 disabled:no-underline">{wait > 0 ? `Resend code in ${wait}s` : "Resend code"}</button>
        {onCancel && <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white">Change details</button>}
      </div>
    </div>
  );
}
