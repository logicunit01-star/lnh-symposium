"use client";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import { useSubmit } from "@/components/ui/useForm";
import { Field, Alert } from "@/components/ui/Field";
import { OtpVerify } from "@/components/ui/OtpVerify";
import { cn, TITLES } from "@/lib/utils";

/**
 * Email-first sign-in (registration redesign, release 2):
 * email → password (existing account) | short sign-up (new) → code. Code sign-in and forgot password for existing accounts.
 */
type Step = "email" | "password" | "code" | "forgot" | "signup" | "verify";
const RULES: [string, (p: string) => boolean][] = [
  ["8+ characters", (p) => p.length >= 8], ["an uppercase letter", (p) => /[A-Z]/.test(p)], ["a number", (p) => /[0-9]/.test(p)], ["a symbol", (p) => /[^A-Za-z0-9]/.test(p)],
];
const maskPhone = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 11); return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d; };
const done = (next: string) => { window.location.href = next + (next.startsWith("/checkout") ? (next.includes("?") ? "&" : "?") + "welcome=1" : ""); };

export function AccountForms({ next, initialMode }: { next: string; initialMode: "signin" | "signup" }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState<string | null>(null);
  const [otp, setOtp] = useState<{ otpId: string; sentTo: string; demoCode?: string } | null>(null);
  const check = useSubmit<{ exists: boolean; firstName: string | null }>("/api/account/check");
  const code = useSubmit<{ otpId: string; sentTo: string; demoCode?: string }>("/api/account/code");

  async function sendCode(purpose: "SIGNIN" | "RESET") {
    const r = await code.submit({ email, purpose });
    if (r) { setOtp(r); setStep(purpose === "SIGNIN" ? "code" : "forgot"); }
  }
  const back = <button type="button" onClick={() => { setStep("email"); setOtp(null); }} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" />Use a different email</button>;

  return (
    <div className="hud p-6 sm:p-8">
      {step === "email" && (
        <form className="mx-auto max-w-md space-y-5" onSubmit={async (e) => {
          e.preventDefault();
          const r = await check.submit({ email });
          if (r) { setFirst(r.firstName); setStep(r.exists ? "password" : "signup"); }
        }}>
          <div>
            <h2 className="font-display text-2xl font-bold text-white">{initialMode === "signup" ? "Create your account" : "Sign in or create an account"}</h2>
            <p className="mt-1 text-sm text-slate-300">Enter your email. If you have an account we ask for your password; if not, you create one in under a minute.</p>
          </div>
          {check.error && <Alert>{check.error}</Alert>}
          <Field label="Email address" name="email" required error={check.fields.email}>
            <input id="email" type="email" autoComplete="email" inputMode="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <button className="btn-primary w-full" disabled={check.loading || !email}>{check.loading ? "Checking…" : "Continue"}</button>
        </form>
      )}

      {step === "password" && <PasswordStep email={email} first={first} next={next} back={back} onCode={() => sendCode("SIGNIN")} onForgot={() => sendCode("RESET")} codeBusy={code.loading} codeError={code.error} />}

      {step === "code" && otp && (
        <div>
          <OtpVerify otpId={otp.otpId} sentTo={otp.sentTo} demoCode={otp.demoCode} verifyUrl="/api/account/code/verify" title="Sign in with a code" onVerified={() => done(next)} onCancel={() => setStep("password")} />
          <div className="mt-4 text-center">{back}</div>
        </div>
      )}

      {step === "forgot" && otp && <ResetStep otp={otp} email={email} next={next} back={back} />}

      {step === "signup" && <SignUp email={email} next={next} back={back} onCode={(o) => { setOtp(o); setStep("verify"); }} />}

      {step === "verify" && otp && (
        <OtpVerify otpId={otp.otpId} sentTo={otp.sentTo} demoCode={otp.demoCode} verifyUrl="/api/account/verify" title="Verify your account" onVerified={() => done(next)} onCancel={() => setStep("signup")} />
      )}
    </div>
  );
}

function PasswordStep({ email, first, next, back, onCode, onForgot, codeBusy, codeError }: { email: string; first: string | null; next: string; back: React.ReactNode; onCode: () => void; onForgot: () => void; codeBusy: boolean; codeError: string | null }) {
  const { submit, loading, error } = useSubmit("/api/account/signin");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  return (
    <form className="mx-auto max-w-md space-y-5" onSubmit={async (e) => { e.preventDefault(); if (await submit({ email, password: pw })) done(next); }}>
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Welcome back{first ? `, ${first}` : ""}</h2>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-300"><Mail className="h-4 w-4" />{email}</p>
      </div>
      {(error || codeError) && <Alert>{error || codeError}</Alert>}
      <Field label="Password" name="pw" required>
        <div className="relative">
          <input id="pw" type={show ? "text" : "password"} autoComplete="current-password" className="input pr-12" value={pw} onChange={(e) => setPw(e.target.value)} required autoFocus />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-slate-300" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
      </Field>
      <button className="btn-primary w-full" disabled={loading || !pw}>{loading ? "Signing in…" : "Sign in"}</button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onCode} disabled={codeBusy} className="min-h-[44px] text-sm font-semibold text-lnh-sky hover:underline">Email and text me a code instead</button>
        <button type="button" onClick={onForgot} disabled={codeBusy} className="min-h-[44px] text-sm text-slate-300 hover:text-white hover:underline">Forgot password?</button>
      </div>
      <div>{back}</div>
    </form>
  );
}

function Strength({ pw }: { pw: string }) {
  const met = RULES.filter(([, t]) => t(pw)).length;
  const missing = RULES.filter(([, t]) => !t(pw)).map(([l]) => l);
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < met ? (met === 4 ? "bg-emerald-400" : met >= 2 ? "bg-lnh-gold" : "bg-lnh-rose") : "bg-white/15")} />)}</div>
      <p className="mt-1.5 text-xs text-slate-300">{met === 4 ? "Strong password" : pw ? `Add ${missing.join(", ")}` : "Use 8+ characters with an uppercase letter, a number and a symbol"}</p>
    </div>
  );
}

function ResetStep({ otp, email, next, back }: { otp: { otpId: string; sentTo: string; demoCode?: string }; email: string; next: string; back: React.ReactNode }) {
  const { submit, loading, error, fields } = useSubmit("/api/account/reset");
  const [c, setC] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const ok = RULES.every(([, t]) => t(pw)) && /^\d{6}$/.test(c);
  return (
    <form className="mx-auto max-w-md space-y-5" onSubmit={async (e) => { e.preventDefault(); if (await submit({ otpId: otp.otpId, code: c, password: pw })) done(next); }}>
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Set a new password</h2>
        <p className="mt-1 text-sm text-slate-300">We sent a 6-digit code to <span className="mono text-white">{otp.sentTo}</span> for {email}. It expires in 5 minutes.</p>
        {otp.demoCode && <p className="mt-3 w-fit rounded-xl border border-lnh-gold/40 bg-lnh-gold/10 px-4 py-2 text-xs text-lnh-gold">Demo mode: your code is <b className="mono text-base tracking-[0.3em]">{otp.demoCode}</b></p>}
      </div>
      {error && <Alert>{error}</Alert>}
      <Field label="6-digit code" name="rcode" required error={fields.code}>
        <input id="rcode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input mono tracking-[0.4em]" value={c} onChange={(e) => setC(e.target.value.replace(/\D/g, "").slice(0, 6))} autoFocus />
      </Field>
      <Field label="New password" name="npw" required error={fields.password}>
        <div className="relative">
          <input id="npw" type={show ? "text" : "password"} autoComplete="new-password" className="input pr-12" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-slate-300" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
        <Strength pw={pw} />
      </Field>
      <button className="btn-primary w-full" disabled={loading || !ok}>{loading ? "Saving…" : "Save password and sign in"}</button>
      <div>{back}</div>
    </form>
  );
}

function SignUp({ email, next, back, onCode }: { email: string; next: string; back: React.ReactNode; onCode: (o: { otpId: string; sentTo: string; demoCode?: string }) => void }) {
  const { submit, loading, error, fields } = useSubmit<{ otpId: string; sentTo: { email: string; phone: string }; demoCode?: string }>("/api/account/signup");
  const [f, setF] = useState({ title: "Dr.", firstName: "", lastName: "", phone: "", password: "" });
  const [show, setShow] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: k === "phone" ? maskPhone(e.target.value) : e.target.value }));
  const ok = RULES.every(([, t]) => t(f.password)) && f.firstName.trim() && f.lastName.trim() && /^03\d{2}-\d{7}$/.test(f.phone);
  return (
    <form className="mx-auto max-w-lg space-y-5" noValidate onSubmit={async (e) => {
      e.preventDefault();
      const r = await submit({ ...f, email });
      if (r?.otpId) onCode({ otpId: r.otpId, sentTo: `${r.sentTo.phone} and ${r.sentTo.email}`, demoCode: r.demoCode });
    }}>
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Create your account</h2>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-300"><Mail className="h-4 w-4" />{email}</p>
        <p className="mt-1 text-sm text-slate-300">Five quick fields. Registration details (CNIC, address, institution) are asked once at checkout.</p>
      </div>
      {error && <Alert>{error}</Alert>}
      {fields.email && <Alert>{fields.email}</Alert>}
      <div className="grid gap-4 sm:grid-cols-[120px_1fr_1fr]">
        <Field label="Title" name="title" required error={fields.title}><select id="title" className="input" value={f.title} onChange={set("title")}>{TITLES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="First name" name="firstName" required error={fields.firstName}><input id="firstName" maxLength={50} autoComplete="given-name" className="input" value={f.firstName} onChange={set("firstName")} autoFocus /></Field>
        <Field label="Last name" name="lastName" required error={fields.lastName}><input id="lastName" maxLength={50} autoComplete="family-name" className="input" value={f.lastName} onChange={set("lastName")} /></Field>
      </div>
      <Field label="Mobile number" name="phone" required error={fields.phone} hint="We text your code and tickets here">
        <input id="phone" inputMode="numeric" autoComplete="tel" placeholder="03XX-XXXXXXX" className="input mono" value={f.phone} onChange={set("phone")} />
      </Field>
      <Field label="Password" name="password" required error={fields.password}>
        <div className="relative">
          <input id="password" type={show ? "text" : "password"} autoComplete="new-password" className="input pr-12" value={f.password} onChange={set("password")} />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center text-slate-300" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
        </div>
        <Strength pw={f.password} />
      </Field>
      <p className="text-xs text-slate-300">Next, we send a 6-digit code to your mobile and email to verify the account.</p>
      <button className="btn-primary w-full" disabled={loading || !ok}>{loading ? "Sending code…" : "Create account"}</button>
      <div>{back}</div>
    </form>
  );
}
