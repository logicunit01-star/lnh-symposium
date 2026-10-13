"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useSubmit } from "@/components/ui/useForm";
import { Field, Alert } from "@/components/ui/Field";
import { cn, pkr, TITLES, SPECIALTIES, SESSION_TYPE_LABEL } from "@/lib/utils";

type Cat = { id: number; label: string; fee: number; note: string | null };
type Sess = { id: string; title: string; type: string; day: number; hall: string | null; when: string; start: string; end: string; fee: number; left: number | null };

const STEPS = ["Personal", "Professional", "Participation", "Review"];
const STEP_FIELDS: string[][] = [
  ["title", "gender", "firstName", "lastName", "email", "phone"],
  ["institution"],
  ["categoryId"],
  ["consent"],
];

export function RegisterForm({ categories, sessions, preselect }: { categories: Cat[]; sessions: Sess[]; preselect?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Record<string, any>>({ title: "Dr.", gender: "", categoryId: "", consent: false, city: "Karachi" });
  const [sel, setSel] = useState<string[]>(preselect && sessions.some((s) => s.id === preselect) ? [preselect] : []);
  const [local, setLocal] = useState<Record<string, string>>({});
  const { submit, loading, error, fields } = useSubmit<{ accessToken: string; regNo: string }>("/api/register");
  const errs = { ...local, ...fields };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const cat = categories.find((c) => String(c.id) === String(f.categoryId));
  const chosen = sessions.filter((s) => sel.includes(s.id));
  const total = (cat?.fee ?? 0) + chosen.reduce((a, s) => a + s.fee, 0);
  const clashes = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < chosen.length; i++) for (let j = i + 1; j < chosen.length; j++) {
      const a = chosen[i], b = chosen[j];
      if (new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end)) out.push(`${a.title} ↔ ${b.title}`);
    }
    return out;
  }, [chosen]);

  function validate(k: number) {
    const e: Record<string, string> = {};
    for (const key of STEP_FIELDS[k]) if (!f[key]) e[key] = key === "consent" ? "Please accept to continue" : "Required";
    if (k === 0 && f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email";
    if (k === 0 && f.phone && !/^(\+92|0092|0)?3\d{2}[- ]?\d{7}$/.test(f.phone.trim())) e.phone = "Use format 03xx-xxxxxxx";
    setLocal(e);
    return Object.keys(e).length === 0;
  }
  const next = () => validate(step) && setStep((s) => Math.min(3, s + 1));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < 3) return next();
    if (!validate(3)) return;
    const r = await submit({ ...f, sessionIds: sel });
    if (r) router.push(`/register/success/${r.accessToken}`);
    else {
      // jump back to the first step that has a server error
      const idx = STEP_FIELDS.findIndex((keys) => keys.some((k) => fields[k]));
      if (idx >= 0) setStep(idx);
    }
  }

  const days = [...new Set(sessions.map((s) => s.day))];

  return (
    <form onSubmit={onSubmit} className="card overflow-hidden" noValidate>
      {/* stepper */}
      <ol className="flex border-b border-white/10">
        {STEPS.map((s, i) => (
          <li key={s} className={cn("flex flex-1 items-center gap-2 px-3 py-4 text-xs font-semibold uppercase tracking-wider sm:px-5", i === step ? "bg-white/5 text-white" : "text-slate-500")}>
            <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px]", i < step ? "bg-emerald-500 text-white" : i === step ? "bg-lnh-red text-white" : "bg-white/10")}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
            <span className="hidden sm:inline">{s}</span>
          </li>
        ))}
      </ol>
      <div className="p-6 sm:p-10">
        {error && <Alert className="mb-6">{error}</Alert>}

        {step === 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Title" name="title" required error={errs.title}>
              <select id="title" className="input" value={f.title} onChange={set("title")}>{TITLES.map((t) => <option key={t}>{t}</option>)}</select>
            </Field>
            <Field label="Gender" required error={errs.gender}>
              <div className="flex gap-2">{["Male", "Female"].map((g) => (
                <label key={g} className={cn("flex flex-1 cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm transition", f.gender === g ? "border-lnh-sky bg-lnh-sky/10 text-white" : "border-white/10 text-slate-300 hover:border-white/30")}>
                  <input type="radio" name="gender" value={g} className="sr-only" checked={f.gender === g} onChange={set("gender")} />{g}
                </label>))}
              </div>
            </Field>
            <Field label="First name" name="firstName" required error={errs.firstName}><input id="firstName" className="input" value={f.firstName ?? ""} onChange={set("firstName")} autoComplete="given-name" /></Field>
            <Field label="Last name" name="lastName" required error={errs.lastName}><input id="lastName" className="input" value={f.lastName ?? ""} onChange={set("lastName")} autoComplete="family-name" /></Field>
            <Field label="Email address" name="email" required error={errs.email}><input id="email" type="email" className="input" value={f.email ?? ""} onChange={set("email")} autoComplete="email" /></Field>
            <Field label="Contact no." name="phone" required error={errs.phone} hint="SMS confirmation will be sent here"><input id="phone" className="input" placeholder="03xx-xxxxxxx" value={f.phone ?? ""} onChange={set("phone")} autoComplete="tel" /></Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="PMDC no." name="pmdcNo" hint="Not mandatory" error={errs.pmdcNo}><input id="pmdcNo" className="input" value={f.pmdcNo ?? ""} onChange={set("pmdcNo")} /></Field>
            <Field label="Specialty" name="specialty" error={errs.specialty}>
              <select id="specialty" className="input" value={f.specialty ?? ""} onChange={set("specialty")}><option value="">Select…</option>{SPECIALTIES.map((s) => <option key={s}>{s}</option>)}</select>
            </Field>
            <Field label="Designation" name="designation" error={errs.designation}><input id="designation" className="input" value={f.designation ?? ""} onChange={set("designation")} /></Field>
            <Field label="Hospital / Institution" name="institution" required error={errs.institution}><input id="institution" className="input" value={f.institution ?? ""} onChange={set("institution")} /></Field>
            <Field label="Address" name="address" className="sm:col-span-2" error={errs.address}><input id="address" className="input" value={f.address ?? ""} onChange={set("address")} autoComplete="street-address" /></Field>
            <Field label="City" name="city" error={errs.city}><input id="city" className="input" value={f.city ?? ""} onChange={set("city")} /></Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <Field label="Registration category" required error={errs.categoryId}>
              <div className="grid gap-3 sm:grid-cols-2">
                {categories.map((c) => (
                  <label key={c.id} className={cn("flex cursor-pointer items-start justify-between gap-3 rounded-2xl border p-4 transition", String(f.categoryId) === String(c.id) ? "border-lnh-red bg-lnh-red/10" : "border-white/10 hover:border-white/30")}>
                    <input type="radio" name="categoryId" value={c.id} className="sr-only" checked={String(f.categoryId) === String(c.id)} onChange={set("categoryId")} />
                    <span><span className="block text-sm font-semibold text-white">{c.label}</span>{c.note && <span className="text-xs text-slate-400">{c.note}</span>}</span>
                    <span className="shrink-0 font-display font-bold text-white">{pkr(c.fee)}</span>
                  </label>
                ))}
              </div>
            </Field>
            <div>
              <p className="label">I want to participate in</p>
              <p className="mb-4 text-xs text-slate-500">Keynotes, panels and ceremonies are included for all registrants. Select the plenary/scientific sessions and workshops you plan to attend.</p>
              {days.map((d) => (
                <div key={d} className="mb-5">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-lnh-sky">Day {d}</p>
                  <div className="space-y-2">
                    {sessions.filter((s) => s.day === d).map((s) => {
                      const full = s.left === 0, on = sel.includes(s.id);
                      return (
                        <label key={s.id} className={cn("flex items-center gap-4 rounded-2xl border p-4 transition", full && !on ? "cursor-not-allowed opacity-50" : "cursor-pointer", on ? "border-lnh-sky bg-lnh-sky/10" : "border-white/10 hover:border-white/30")}>
                          <input type="checkbox" className="h-5 w-5 shrink-0 accent-[#D2192E]" disabled={full && !on} checked={on}
                            onChange={() => setSel((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-white">{s.title}</span>
                            <span className="block text-xs text-slate-400">{SESSION_TYPE_LABEL[s.type]} · {s.when}{s.hall ? ` · ${s.hall}` : ""}</span>
                          </span>
                          <span className="shrink-0 text-right text-xs">
                            <span className="block font-bold text-white">{s.fee ? pkr(s.fee) : "Included"}</span>
                            {s.left != null && <span className={full ? "text-lnh-rose" : "text-slate-400"}>{full ? "Full" : `${s.left} left`}</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
              {clashes.length > 0 && <Alert kind="info" className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /><span>Time clash: {clashes.join("; ")}. You can still register, but you will only be able to attend one at a time.</span></Alert>}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="grid gap-x-8 gap-y-3 rounded-2xl border border-white/10 p-5 text-sm sm:grid-cols-2">
              {[
                ["Name", `${f.title} ${f.firstName} ${f.lastName}`], ["Gender", f.gender], ["Email", f.email], ["Contact", f.phone],
                ["PMDC no.", f.pmdcNo || "—"], ["Specialty", f.specialty || "—"], ["Designation", f.designation || "—"], ["Institution", f.institution],
                ["Address", [f.address, f.city].filter(Boolean).join(", ") || "—"], ["Category", cat?.label],
              ].map(([k, v]) => <div key={k}><p className="text-[10px] uppercase tracking-widest text-slate-500">{k}</p><p className="text-white">{v}</p></div>)}
            </div>
            <div className="rounded-2xl border border-white/10 p-5">
              <p className="eyebrow mb-4">Fee summary</p>
              <div className="flex justify-between py-1.5 text-sm"><span className="text-slate-300">Conference registration — {cat?.label}</span><span className="font-semibold text-white">{pkr(cat?.fee ?? 0)}</span></div>
              {chosen.map((s) => <div key={s.id} className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-slate-300">{s.title}</span><span className="shrink-0 font-semibold text-white">{s.fee ? pkr(s.fee) : "Included"}</span></div>)}
              <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-4"><span className="font-semibold uppercase tracking-wider text-white">Total</span><span className="font-display text-3xl font-bold text-lnh-rose">{pkr(total)}</span></div>
            </div>
            <Field label="" error={errs.consent}>
              <label className="flex cursor-pointer gap-3 text-sm text-slate-300">
                <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[#D2192E]" checked={!!f.consent} onChange={set("consent")} />
                <span>I confirm the information above is correct and agree to receive registration updates by email and SMS. Fees are non-refundable after payment.</span>
              </label>
            </Field>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-white/10 pt-6">
          {step > 0 ? <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4" /> Back</button> : <span />}
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-400 sm:inline">Total <b className="text-white">{pkr(total)}</b></span>
            {step < 3 ? <button type="button" className="btn-primary" onClick={next}>Continue <ChevronRight className="h-4 w-4" /></button>
              : <button className="btn-primary" disabled={loading}>{loading ? "Submitting…" : "Submit registration"}</button>}
          </div>
        </div>
      </div>
    </form>
  );
}
