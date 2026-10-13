"use client";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useSubmit } from "@/components/ui/useForm";
import { Field, Alert } from "@/components/ui/Field";
import { cn, TITLES, SPECIALTIES, COUNTRIES, wordCount } from "@/lib/utils";

export function AbstractForm({ initialType, wordLimit }: { initialType: "ORAL" | "POSTER"; wordLimit: number }) {
  const [type, setType] = useState(initialType);
  const [body, setBody] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const { submit, loading, error, fields } = useSubmit<{ refNo: string }>("/api/abstracts");
  const wc = wordCount(body);
  if (done) return (
    <div className="card p-10 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
      <p className="eyebrow mt-6">Submission received</p>
      <p className="h-display mt-3 text-5xl text-white">{done}</p>
      <p className="mx-auto mt-4 max-w-md text-slate-400">Your reference number has been emailed and sent by SMS. Please quote it in all correspondence.</p>
    </div>
  );
  const inp = (name: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => <input id={name} name={name} className="input" {...props} />;
  return (
    <form className="card p-6 sm:p-10" noValidate onSubmit={async (e) => {
      e.preventDefault();
      const d: any = Object.fromEntries(new FormData(e.currentTarget));
      d.type = type; d.declaration = d.declaration === "on";
      const r = await submit(d);
      if (r) { setDone(r.refNo); window.scrollTo({ top: 0, behavior: "smooth" }); }
    }}>
      <div className="mb-8 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 p-1.5">
        {(["ORAL", "POSTER"] as const).map((t) => (
          <button type="button" key={t} onClick={() => setType(t)} className={cn("rounded-xl py-3 text-sm font-semibold transition", type === t ? "bg-lnh-red text-white" : "text-slate-400 hover:text-white")}>
            {t === "ORAL" ? "Scientific paper" : "Poster"}
          </button>
        ))}
      </div>
      {error && <Alert className="mb-6">{error}</Alert>}
      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="eyebrow mb-5">Author details</legend>
        <Field label="Title" name="title" required error={fields.title}><select id="title" name="title" className="input" defaultValue="Dr.">{TITLES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Gender" name="gender" required error={fields.gender}><select id="gender" name="gender" className="input" defaultValue=""><option value="" disabled>Select…</option><option>Male</option><option>Female</option></select></Field>
        <Field label="First name" name="firstName" required error={fields.firstName}>{inp("firstName")}</Field>
        <Field label="Last name" name="lastName" required error={fields.lastName}>{inp("lastName")}</Field>
        <Field label="Profession" name="profession" error={fields.profession}>{inp("profession")}</Field>
        <Field label="Representing organization" name="organization" required error={fields.organization}>{inp("organization")}</Field>
        <Field label="Department" name="department" required error={fields.department}>{inp("department")}</Field>
        <Field label="City" name="city" required error={fields.city}>{inp("city")}</Field>
        <Field label="Country" name="country" required error={fields.country}><select id="country" name="country" className="input" defaultValue="Pakistan">{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Telephone" name="telephone" error={fields.telephone}>{inp("telephone")}</Field>
        <Field label="Mobile" name="mobile" required error={fields.mobile}>{inp("mobile", { placeholder: "03xx-xxxxxxx" })}</Field>
        <Field label="Email" name="email" required error={fields.email}>{inp("email", { type: "email" })}</Field>
        <Field label="Highest academic qualification" name="qualification" error={fields.qualification}>{inp("qualification", { placeholder: "e.g. MBBS, FCPS" })}</Field>
        <Field label="Year of qualification" name="qualificationYear" error={fields.qualificationYear}>{inp("qualificationYear", { type: "number", min: 1950, max: 2100 })}</Field>
      </fieldset>
      <fieldset className="mt-10 grid gap-5 border-t border-white/10 pt-8 sm:grid-cols-2">
        <legend className="eyebrow mb-5 pt-8">Abstract</legend>
        <Field label="Specialty" name="specialty" required error={fields.specialty}><select id="specialty" name="specialty" className="input" defaultValue=""><option value="" disabled>Select…</option>{SPECIALTIES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Presenting author" name="presentingAuthor" required error={fields.presentingAuthor}>{inp("presentingAuthor")}</Field>
        <Field label="Authors" name="authors" required error={fields.authors} className="sm:col-span-2" hint="All authors in order, with affiliations, separated by semicolons">{inp("authors")}</Field>
        <Field label="Abstract title" name="abstractTitle" required error={fields.abstractTitle} className="sm:col-span-2">{inp("abstractTitle")}</Field>
        <Field label={`Abstract (max ${wordLimit} words)`} name="body" required error={fields.body} className="sm:col-span-2">
          <textarea id="body" name="body" rows={12} className="input font-mono text-[13px] leading-relaxed" value={body} onChange={(e) => setBody(e.target.value)}
            placeholder={"Introduction: …\n\nMethods: …\n\nResults: …\n\nConclusions: …"} />
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className={cn("h-full rounded-full transition-all", wc > wordLimit ? "bg-lnh-red" : "bg-lnh-sky")} style={{ width: `${Math.min(100, (wc / wordLimit) * 100)}%` }} /></div>
            <span className={cn("text-xs tabular-nums", wc > wordLimit ? "text-lnh-rose" : "text-slate-400")}>{wc} / {wordLimit} words</span>
          </div>
        </Field>
        <Field label="Keywords" name="keywords" error={fields.keywords} className="sm:col-span-2" hint="3–5 keywords, comma separated">{inp("keywords")}</Field>
      </fieldset>
      <Field label="" error={fields.declaration} className="mt-8">
        <label className="flex cursor-pointer gap-3 text-sm text-slate-300"><input type="checkbox" name="declaration" className="mt-0.5 h-5 w-5 accent-[#D2192E]" />
          <span>I declare this work is original, all authors have approved the submission, and ethical approval was obtained where required.</span></label>
      </Field>
      <button className="btn-primary mt-8" disabled={loading || wc > wordLimit}>{loading ? "Submitting…" : `Submit ${type === "ORAL" ? "scientific paper" : "poster"} abstract`}</button>
    </form>
  );
}
