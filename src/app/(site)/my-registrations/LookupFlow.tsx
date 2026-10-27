"use client";
import { useState } from "react";
import Link from "next/link";
import { FileDown, QrCode, Smartphone } from "lucide-react";
import { useSubmit } from "@/components/ui/useForm";
import { Field, Alert } from "@/components/ui/Field";
import { OtpVerify } from "@/components/ui/OtpVerify";
import { cn, pkr } from "@/lib/utils";

type Reg = { regNo: string; name: string; status: string; total: number; category: string; passUrl: string; pdfUrl: string; items: { title: string; when: string; venue: string | null }[] };
const maskPhone = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 11); return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d; };
const STATUS: Record<string, string> = { PAID: "text-emerald-300 border-emerald-400/40 bg-emerald-400/10", WAIVED: "text-sky-300 border-sky-400/40 bg-sky-400/10", PENDING: "text-lnh-gold border-lnh-gold/40 bg-lnh-gold/10" };

export function LookupFlow() {
  const { submit, loading, error, fields } = useSubmit("/api/lookup/start");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<{ otpId: string; sentTo: string; demoCode?: string } | null>(null);
  const [regs, setRegs] = useState<Reg[] | null>(null);

  if (regs) return (
    <div className="space-y-4">
      {regs.length === 0 ? <Alert kind="info">No registrations were found for this mobile number. <Link href="/register" className="underline">Register now</Link>.</Alert> : regs.map((r) => (
        <article key={r.regNo} className="hud p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="mono text-xs text-lnh-sky">{r.regNo}</p><h2 className="font-display text-xl font-bold text-white">{r.name}</h2><p className="text-sm text-slate-400">{r.category} · {pkr(r.total)}</p></div>
            <span className={cn("rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider", STATUS[r.status] ?? "border-white/15 text-slate-300")}>{r.status === "PENDING" ? "Payment pending" : r.status}</span>
          </div>
          {r.items.length > 0 && <ul className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-sm">{r.items.map((i) => <li key={i.title} className="flex flex-wrap justify-between gap-2"><span className="text-slate-200">{i.title}</span><span className="mono text-xs text-slate-500">{i.when}{i.venue ? ` · ${i.venue}` : ""}</span></li>)}</ul>}
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={r.passUrl} className="btn-primary btn-sm"><QrCode className="h-4 w-4" />{r.status === "PENDING" ? "Pay and get QR pass" : "Show QR pass"}</Link>
            <a href={r.pdfUrl} className="btn-ghost btn-sm"><FileDown className="h-4 w-4" />Confirmation PDF</a>
          </div>
        </article>
      ))}
      <button onClick={() => { setRegs(null); setOtp(null); }} className="text-sm text-lnh-sky hover:underline">Look up another number</button>
    </div>
  );
  if (otp) return <div className="hud p-6 sm:p-10"><OtpVerify otpId={otp.otpId} sentTo={otp.sentTo} demoCode={otp.demoCode} verifyUrl="/api/lookup/verify" title="Enter your code" onVerified={(j) => setRegs(j.registrations)} onCancel={() => setOtp(null)} /></div>;
  return (
    <form className="hud space-y-5 p-6 sm:p-10" onSubmit={async (e) => { e.preventDefault(); const r = await submit({ phone }); if (r) setOtp(r); }}>
      {error && <Alert>{error}</Alert>}
      <Field label="Mobile number" name="lk-phone" required error={fields.phone} hint="The number you gave when registering">
        <div className="relative"><Smartphone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input id="lk-phone" inputMode="numeric" autoComplete="tel" placeholder="03XX-XXXXXXX" className="input mono pl-11" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} /></div>
      </Field>
      <button className="btn-primary w-full sm:w-auto" disabled={loading || phone.replace(/\D/g, "").length !== 11}>{loading ? "Sending code…" : "Send me a code"}</button>
      <p className="text-xs text-slate-500">For your privacy we show the same message whether or not the number is registered. Codes expire in 5 minutes.</p>
    </form>
  );
}
