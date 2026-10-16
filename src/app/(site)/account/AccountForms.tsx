"use client";
import { useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { useSubmit } from "@/components/ui/useForm";
import { Field, Alert } from "@/components/ui/Field";
import { cn, TITLES, SPECIALTIES } from "@/lib/utils";

const RULES: [string, (p: string) => boolean][] = [
  ["8+ characters", (p) => p.length >= 8], ["Uppercase letter", (p) => /[A-Z]/.test(p)], ["Number", (p) => /[0-9]/.test(p)], ["Special character", (p) => /[^A-Za-z0-9]/.test(p)],
];
const maskPhone = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 11); return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d; };

export function AccountForms({ next, initialMode }: { next: string; initialMode: "signin" | "signup" }) {
  const [mode, setMode] = useState(initialMode);
  return (
    <div className="hud overflow-hidden">
      <div className="grid grid-cols-2 border-b border-white/10">
        {(["signin", "signup"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={cn("py-4 text-sm font-semibold uppercase tracking-wider transition", mode === m ? "bg-white/5 text-white shadow-[inset_0_-2px_0_#D2192E]" : "text-slate-500 hover:text-white")}>
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <div className="p-6 sm:p-8">{mode === "signin" ? <SignIn next={next} onSwitch={() => setMode("signup")} /> : <SignUp next={next} />}</div>
    </div>
  );
}

function SignIn({ next, onSwitch }: { next: string; onSwitch: () => void }) {
  const { submit, loading, error } = useSubmit("/api/account/signin");
  const [show, setShow] = useState(false);
  return (
    <form className="mx-auto max-w-md space-y-5" onSubmit={async (e) => {
      e.preventDefault();
      if (await submit(Object.fromEntries(new FormData(e.currentTarget)))) window.location.href = next;
    }}>
      {error && <Alert>{error}</Alert>}
      <Field label="Email address (username)" name="si-email" required><input id="si-email" name="email" type="email" autoComplete="email" className="input" required /></Field>
      <Field label="Password" name="si-pw" required>
        <div className="relative"><input id="si-pw" name="password" type={show ? "text" : "password"} autoComplete="current-password" className="input pr-12" required />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
      </Field>
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
      <p className="text-center text-sm text-slate-400">New here? <button type="button" onClick={onSwitch} className="text-lnh-sky hover:underline">Create an account</button></p>
    </form>
  );
}

function SignUp({ next }: { next: string }) {
  const { submit, loading, error, fields } = useSubmit("/api/account/signup");
  const [f, setF] = useState<Record<string, string>>({ title: "Dr.", gender: "" });
  const [show, setShow] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: k === "phone" ? maskPhone(e.target.value) : e.target.value }));
  const pw = f.password ?? "";
  const ok = RULES.every(([, t]) => t(pw));
  return (
    <form className="grid gap-5 sm:grid-cols-2" noValidate onSubmit={async (e) => {
      e.preventDefault();
      if (await submit(f)) window.location.href = next;
    }}>
      {error && <Alert className="sm:col-span-2">{error}</Alert>}
      <Field label="Title" name="title" required error={fields.title}><select id="title" className="input" value={f.title} onChange={set("title")}>{TITLES.map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="Gender" required error={fields.gender}>
        <div className="flex gap-2">{["Male", "Female"].map((g) => (
          <label key={g} className={cn("flex flex-1 cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm transition", f.gender === g ? "border-lnh-sky bg-lnh-sky/10 text-white" : "border-white/10 text-slate-300 hover:border-white/30")}>
            <input type="radio" name="gender" value={g} className="sr-only" checked={f.gender === g} onChange={set("gender")} />{g}</label>))}</div>
      </Field>
      <Field label="First name" name="firstName" required error={fields.firstName}><input id="firstName" maxLength={50} autoComplete="given-name" className="input" value={f.firstName ?? ""} onChange={set("firstName")} /></Field>
      <Field label="Last name" name="lastName" required error={fields.lastName}><input id="lastName" maxLength={50} autoComplete="family-name" className="input" value={f.lastName ?? ""} onChange={set("lastName")} /></Field>
      <Field label="Email address (your username)" name="email" required error={fields.email}><input id="email" type="email" autoComplete="email" className="input" value={f.email ?? ""} onChange={set("email")} /></Field>
      <Field label="Contact no." name="phone" required error={fields.phone} hint="03XX-XXXXXXX"><input id="phone" inputMode="numeric" autoComplete="tel" placeholder="03XX-XXXXXXX" className="input mono" value={f.phone ?? ""} onChange={set("phone")} /></Field>
      <Field label="PMDC no." name="pmdcNo" hint="Optional" error={fields.pmdcNo}><input id="pmdcNo" className="input" value={f.pmdcNo ?? ""} onChange={set("pmdcNo")} /></Field>
      <Field label="Specialty" name="specialty" hint="Start typing to see suggestions" error={fields.specialty}>
        <input id="specialty" list="specialties" className="input" value={f.specialty ?? ""} onChange={set("specialty")} />
        <datalist id="specialties">{SPECIALTIES.map((s) => <option key={s} value={s} />)}</datalist>
      </Field>
      <Field label="Designation" name="designation" hint="Optional" error={fields.designation}><input id="designation" className="input" value={f.designation ?? ""} onChange={set("designation")} /></Field>
      <Field label="Hospital / institution" name="institution" required error={fields.institution}><input id="institution" className="input" value={f.institution ?? ""} onChange={set("institution")} /></Field>
      <Field label="Address" name="address" hint="Optional" error={fields.address} className="sm:col-span-2"><textarea id="address" rows={2} autoComplete="street-address" className="input" value={f.address ?? ""} onChange={set("address")} /></Field>
      <Field label="Password" name="password" required error={fields.password}>
        <div className="relative"><input id="password" type={show ? "text" : "password"} autoComplete="new-password" className="input pr-12" value={pw} onChange={set("password")} />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
        <ul className="mt-2 grid grid-cols-2 gap-1">{RULES.map(([l, t]) => (
          <li key={l} className={cn("flex items-center gap-1.5 text-[11px]", t(pw) ? "text-emerald-300" : "text-slate-500")}>{t(pw) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{l}</li>))}</ul>
      </Field>
      <Field label="Confirm password" name="confirm" required error={fields.confirm}><input id="confirm" type={show ? "text" : "password"} autoComplete="new-password" className="input" value={f.confirm ?? ""} onChange={set("confirm")} /></Field>
      <p className="text-xs text-slate-500 sm:col-span-2">Identity verification by a one-time code (SMS and email) will be enabled when the eOcean and email services are connected.</p>
      <div className="sm:col-span-2"><button className="btn-primary w-full sm:w-auto" disabled={loading || !ok}>{loading ? "Creating account…" : "Create account & continue"}</button></div>
    </form>
  );
}
