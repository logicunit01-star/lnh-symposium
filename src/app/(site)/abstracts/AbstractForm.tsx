"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useSubmit } from "@/components/ui/useForm";
import { Field, Alert } from "@/components/ui/Field";
import { cn, COUNTRIES } from "@/lib/utils";

type Kind = "ORIGINAL" | "CASE";
const SECTIONS: Record<Kind, [string, string][]> = {
  ORIGINAL: [["background", "Background / Introduction"], ["methods", "Methods"], ["results", "Results"], ["conclusion", "Conclusion"]],
  CASE: [["background", "Background / Introduction"], ["cases", "Case / cases"]],
};
const PREFS = [
  ["ORAL", "Oral presentation", "Reviewed for oral; may be accepted, rejected or returned to the secretariat."],
  ["POSTER", "Poster presentation", "Reviewed for poster; may be accepted, rejected or returned to the secretariat."],
  ["EITHER", "Either oral or poster", "Oral preferred; the department may accept it as oral or as poster."],
] as const;
const countWords = (t: string) => (t.trim().match(/\S+/g) || []).length;

export function AbstractForm({ wordLimit, departments, account }: {
  wordLimit: number; departments: string[];
  account: { title: string; name: string; email: string; phone: string; institution: string; designation: string; city: string };
}) {
  const [pref, setPref] = useState<string>("");
  const [kind, setKind] = useState<Kind>("ORIGINAL");
  const [sec, setSec] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [co, setCo] = useState([{ name: "", affiliation: "" }]);
  const [kw, setKw] = useState("");
  const [dup, setDup] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { submit, loading, error, fields } = useSubmit<{ refNo: string }>("/api/abstracts");

  const total = useMemo(() => SECTIONS[kind].reduce((a, [k]) => a + countWords(sec[k] ?? ""), 0), [sec, kind]);
  const tw = countWords(title);
  const keywords = kw.split(",").map((x) => x.trim()).filter(Boolean);

  useEffect(() => {
    if (title.trim().length < 10) { setDup(null); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/abstracts?title=${encodeURIComponent(title)}`).then((r) => r.json()).catch(() => ({}));
      setDup(r.duplicate ?? null);
    }, 500);
    return () => clearTimeout(t);
  }, [title]);

  if (done) return (
    <div className="hud p-10 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
      <p className="eyebrow mt-6">Abstract received</p>
      <p className="h-display mt-3 text-5xl text-white">{done}</p>
      <p className="mx-auto mt-4 max-w-md text-slate-400">Your abstract ID and a confirmation have been emailed to you. Track its status under My bookings. All further correspondence will be with you as the presenting author.</p>
    </div>
  );

  const fe = (k: string) => fields[k];
  return (
    <form className="hud space-y-8 p-6 sm:p-10" noValidate onSubmit={async (e) => {
      e.preventDefault();
      const d: any = Object.fromEntries(new FormData(e.currentTarget));
      const r = await submit({
        presentationPref: pref, specialty: d.specialty, title: d.title, fullName: d.fullName, designation: d.designation, organization: d.organization,
        department: d.department, city: d.city, country: d.country, email: d.email, mobile: d.mobile, coAuthors: co,
        abstractTitle: title, kind, sections: sec, keywords, declaration: d.declaration === "on",
      });
      if (r) { setDone(r.refNo); window.scrollTo({ top: 0 }); }
    }}>
      {error && <Alert>{error}</Alert>}

      <section>
        <h2 className="font-display text-lg font-bold text-white">1 · Preferred presentation format <span className="text-lnh-red">*</span></h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {PREFS.map(([v, l, d]) => (
            <label key={v} className={cn("cursor-pointer rounded-2xl border p-4 transition", pref === v ? "border-lnh-sky bg-lnh-sky/10" : "border-white/10 hover:border-white/30")}>
              <input type="radio" name="pref" value={v} checked={pref === v} onChange={() => setPref(v)} className="sr-only" />
              <span className="font-semibold text-white">{l}</span><span className="mt-1 block text-xs text-slate-400">{d}</span>
            </label>
          ))}
        </div>
        {fe("presentationPref") && <p className="err">{fe("presentationPref")}</p>}
        <div className="mt-4 max-w-md"><Field label="Speciality / department / session" name="specialty" required error={fe("specialty")}>
          <select id="specialty" name="specialty" className="input" defaultValue=""><option value="" disabled>Choose…</option>{departments.map((x) => <option key={x}>{x}</option>)}</select>
        </Field></div>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold text-white">2 · Presenting author</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-6">
          <Field label="Title" name="title" required className="sm:col-span-1"><select id="title" name="title" defaultValue={["Prof.", "Dr.", "Mr.", "Ms."].includes(account.title) ? account.title : "Dr."} className="input">{["Prof.", "Dr.", "Mr.", "Ms."].map((t) => <option key={t}>{t}</option>)}</select></Field>
          <Field label="Full name" name="fullName" required error={fe("fullName")} className="sm:col-span-3"><input id="fullName" name="fullName" defaultValue={account.name} className="input" /></Field>
          <Field label="Designation" name="designation" required error={fe("designation")} className="sm:col-span-2"><input id="designation" name="designation" defaultValue={account.designation} className="input" /></Field>
          <Field label="Representing organization" name="organization" required error={fe("organization")} className="sm:col-span-3"><input id="organization" name="organization" defaultValue={account.institution} className="input" /></Field>
          <Field label="Department" name="department" required error={fe("department")} className="sm:col-span-3"><input id="department" name="department" className="input" /></Field>
          <Field label="City" name="city" required error={fe("city")} className="sm:col-span-2"><input id="city" name="city" defaultValue={account.city} className="input" /></Field>
          <Field label="Country" name="country" required error={fe("country")} className="sm:col-span-2"><select id="country" name="country" defaultValue="Pakistan" className="input">{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Contact number" name="mobile" required error={fe("mobile")} className="sm:col-span-2"><input id="mobile" name="mobile" defaultValue={account.phone} className="input mono" /></Field>
          <Field label="Email address" name="email" required error={fe("email")} className="sm:col-span-6"><input id="email" name="email" type="email" defaultValue={account.email} className="input" /></Field>
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold text-white">3 · Co-authors <span className="text-sm font-normal text-slate-400">(1 to 6, in programme / e-abstract book order, with affiliations)</span></h2>
        <div className="mt-3 space-y-3">
          {co.map((c, i) => (
            <div key={i} className="grid items-end gap-3 sm:grid-cols-[2rem_1fr_1.4fr_auto]">
              <span className="mono pb-3 text-sm text-slate-500">{i + 1}.</span>
              <Field label="Name" error={fe(`coAuthors.${i}.name`)}><input value={c.name} onChange={(e) => setCo(co.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} className="input" aria-label={`Co-author ${i + 1} name`} /></Field>
              <Field label="Affiliation" error={fe(`coAuthors.${i}.affiliation`)}><input value={c.affiliation} onChange={(e) => setCo(co.map((x, j) => j === i ? { ...x, affiliation: e.target.value } : x))} className="input" aria-label={`Co-author ${i + 1} affiliation`} /></Field>
              <button type="button" disabled={co.length === 1} onClick={() => setCo(co.filter((_, j) => j !== i))} className="mb-1 grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-slate-400 hover:text-lnh-rose disabled:opacity-30" aria-label="Remove co-author"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {co.length < 6 && <button type="button" onClick={() => setCo([...co, { name: "", affiliation: "" }])} className="btn-ghost btn-sm"><Plus className="h-4 w-4" />Add co-author</button>}
          {fe("coAuthors") && <p className="err">{fe("coAuthors")}</p>}
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg font-bold text-white">4 · Abstract details</h2>
        <div className="mt-3 space-y-4">
          <Field label="Abstract title (full title, maximum 35 words)" name="abstractTitle" required error={fe("abstractTitle")}>
            <textarea id="abstractTitle" rows={2} value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
            <p className={cn("mt-1 text-xs", tw > 35 ? "text-lnh-rose" : "text-slate-500")}>{tw} / 35 words</p>
            {dup && <p className="err">An abstract with this title already exists ({dup}). Duplicate submissions are not accepted.</p>}
          </Field>
          <div>
            <p className="label">Abstract type <span className="text-lnh-red">*</span></p>
            <div className="flex flex-wrap gap-2">{([["ORIGINAL", "Original research"], ["CASE", "Case report / case series"]] as const).map(([v, l]) => (
              <button type="button" key={v} onClick={() => setKind(v)} className={cn("rounded-full border px-4 py-2 text-sm", kind === v ? "border-lnh-sky bg-lnh-sky/10 text-white" : "border-white/10 text-slate-300")}>{l}</button>
            ))}</div>
          </div>
          {SECTIONS[kind].map(([k, label]) => (
            <Field key={k} label={label} name={`s_${k}`} required error={fe(`s_${k}`) || fe(`sections.${k}`)}>
              <textarea id={`s_${k}`} rows={k === "background" ? 3 : 4} value={sec[k] ?? ""} onChange={(e) => setSec({ ...sec, [k]: e.target.value })} className="input" />
            </Field>
          ))}
          <p className={cn("mono text-sm", total > wordLimit ? "text-lnh-rose" : "text-slate-400")}>{total} / {wordLimit} words (sections only; title, authors and affiliations excluded)</p>
          {fe("sections") && <p className="err">{fe("sections")}</p>}
          <Field label="Keywords (3 to 5, separated by commas)" name="kw" required error={fe("keywords")}>
            <input id="kw" value={kw} onChange={(e) => setKw(e.target.value)} className="input" placeholder="artificial intelligence, triage, emergency department" />
            <div className="mt-2 flex flex-wrap gap-1.5">{keywords.map((k) => <span key={k} className="chip">{k}</span>)}</div>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <label className="flex gap-3 text-sm text-slate-300"><input type="checkbox" name="declaration" className="mt-1 h-4 w-4 accent-[#3FB8F0]" />
          <span>I declare this work is original, all authors have approved the submission and ethical approval was obtained where required.</span></label>
        {fe("declaration") && <p className="err">{fe("declaration")}</p>}
        <p className="mt-3 text-xs text-slate-500">Once the abstract is submitted, all further correspondence will be with the presenting author.</p>
      </section>

      <button className="btn-primary w-full sm:w-auto" disabled={loading || !!dup || total > wordLimit || tw > 35}>{loading ? "Submitting…" : "Submit abstract"}</button>
    </form>
  );
}
