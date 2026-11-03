"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmit } from "@/components/ui/useForm";
import { Field, Alert } from "@/components/ui/Field";
import { cn, TITLES, COUNTRIES } from "@/lib/utils";
import { GUEST_ROLES, PROVINCES, maskCnic, maskPhone } from "@/lib/reg-fields";

/** Guests / Volunteers Registration Form 2027 (LNH). */
export function GuestForm({ kind, departments }: { kind: "GUEST" | "VOLUNTEER"; departments: string[] }) {
  const router = useRouter();
  const [f, setF] = useState<Record<string, string>>({ title: kind === "GUEST" ? "Dr." : "Mr.", gender: "", country: "Pakistan", province: "Sindh", city: "Karachi" });
  const pk = (f.country || "Pakistan") === "Pakistan";
  const { submit, loading, error, fields } = useSubmit<{ accessToken: string }>("/api/register/guest");
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: k === "phone" || k === "whatsapp" ? maskPhone(e.target.value) : k === "cnic" && (p.country || "Pakistan") === "Pakistan" ? maskCnic(e.target.value) : e.target.value }));
  return (
    <form className="hud grid gap-5 p-6 sm:grid-cols-6 sm:p-10" noValidate onSubmit={async (e) => {
      e.preventDefault();
      const r = await submit({ ...f, regType: kind });
      if (r) router.push(`/register/success/${r.accessToken}`);
    }}>
      {error && <Alert className="sm:col-span-6">{error}</Alert>}
      <p className="eyebrow sm:col-span-6">Basic information</p>
      <Field label="Title" name="title" required className="sm:col-span-1"><select id="title" className="input" value={f.title} onChange={set("title")}>{TITLES.map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field label="First name" name="firstName" required error={fields.firstName} className="sm:col-span-2"><input id="firstName" className="input" value={f.firstName ?? ""} onChange={set("firstName")} autoComplete="given-name" /></Field>
      <Field label="Last name" name="lastName" required error={fields.lastName} className="sm:col-span-3"><input id="lastName" className="input" value={f.lastName ?? ""} onChange={set("lastName")} autoComplete="family-name" /></Field>
      <Field label="Gender" required error={fields.gender} className="sm:col-span-2">
        <div className="flex gap-2">{["Male", "Female"].map((g) => (
          <label key={g} className={cn("flex flex-1 cursor-pointer items-center justify-center rounded-xl border px-3 py-3 text-sm", f.gender === g ? "border-lnh-sky bg-lnh-sky/10 text-white" : "border-white/10 text-slate-300")}>
            <input type="radio" name="gender" value={g} className="sr-only" checked={f.gender === g} onChange={set("gender")} />{g}</label>))}</div>
      </Field>
      <Field label="Cell no." name="phone" required error={fields.phone} className="sm:col-span-2"><input id="phone" inputMode="numeric" placeholder="03XX-XXXXXXX" className="input mono" value={f.phone ?? ""} onChange={set("phone")} /></Field>
      <Field label="WhatsApp no." name="whatsapp" error={fields.whatsapp} className="sm:col-span-2"><input id="whatsapp" inputMode="numeric" placeholder="03XX-XXXXXXX" className="input mono" value={f.whatsapp ?? ""} onChange={set("whatsapp")} /></Field>
      <Field label="Address" name="address" required error={fields.address} className="sm:col-span-6"><input id="address" className="input" value={f.address ?? ""} onChange={set("address")} autoComplete="street-address" /></Field>
      <Field label="Country" name="country" className="sm:col-span-2"><select id="country" className="input" value={f.country} onChange={set("country")}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Province" name="province" className="sm:col-span-2">{pk ? <select id="province" className="input" value={f.province ?? ""} onChange={set("province")}><option value="">Choose…</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select> : <input id="province" className="input" value={f.province ?? ""} onChange={set("province")} />}</Field>
      <Field label="City" name="city" required error={fields.city} className="sm:col-span-2"><input id="city" className="input" value={f.city ?? ""} onChange={set("city")} /></Field>
      <Field label="Email" name="email" required error={fields.email} className="sm:col-span-3"><input id="email" type="email" className="input" value={f.email ?? ""} onChange={set("email")} autoComplete="email" /></Field>
      <Field label={pk ? "CNIC no." : "Passport no."} name="cnic" required error={fields.cnic} className="sm:col-span-3"><input id="cnic" inputMode={pk ? "numeric" : "text"} placeholder={pk ? "12345-1234567-1" : ""} className="input mono" value={f.cnic ?? ""} onChange={set("cnic")} /></Field>
      {kind === "GUEST" && <Field label="PMDC number (medical doctors only)" name="pmdcNo" className="sm:col-span-3"><input id="pmdcNo" className="input" value={f.pmdcNo ?? ""} onChange={set("pmdcNo")} /></Field>}
      {kind === "GUEST" && <Field label="Highest academic qualification" name="qualification" className="sm:col-span-3"><input id="qualification" className="input" value={f.qualification ?? ""} onChange={set("qualification")} /></Field>}
      <Field label={kind === "GUEST" ? "Organization / institute" : "Organization"} name="institution" required error={fields.institution} className="sm:col-span-6"><input id="institution" className="input" value={f.institution ?? ""} onChange={set("institution")} /></Field>

      {kind === "GUEST" ? <>
        <p className="eyebrow mt-2 sm:col-span-6">Your role</p>
        <Field label="Scientific session" name="guestSession" required error={fields.guestSession} className="sm:col-span-6"><input id="guestSession" className="input" value={f.guestSession ?? ""} onChange={set("guestSession")} placeholder="Session title as in your invitation" /></Field>
        <Field label="Category" required error={fields.guestRole} className="sm:col-span-6">
          <div className="grid gap-2 sm:grid-cols-4">{Object.entries(GUEST_ROLES).map(([k, l]) => (
            <label key={k} className={cn("cursor-pointer rounded-xl border px-3 py-3 text-center text-sm", f.guestRole === k ? "border-lnh-sky bg-lnh-sky/10 text-white" : "border-white/10 text-slate-300")}>
              <input type="radio" name="guestRole" value={k} className="sr-only" checked={f.guestRole === k} onChange={set("guestRole")} />{l}</label>))}</div>
        </Field>
        <Field label="Department" name="department" required error={fields.department} className="sm:col-span-6"><select id="department" className="input" value={f.department ?? ""} onChange={set("department")}><option value="">Choose…</option>{departments.map((d) => <option key={d}>{d}</option>)}</select></Field>
        <p className="text-xs text-slate-500 sm:col-span-6">Approval by the Head of Department replaces the HOD's signature and stamp on the paper form. Your pass is emailed once approved. Guest registration is complimentary.</p>
      </> : <>
        <Field label="Department" name="department" required error={fields.department} className="sm:col-span-3"><input id="department" className="input" value={f.department ?? ""} onChange={set("department")} /></Field>
        <Field label="Academic year" name="academicYear" required error={fields.academicYear} className="sm:col-span-3"><input id="academicYear" className="input" value={f.academicYear ?? ""} onChange={set("academicYear")} placeholder="e.g. 3rd year MBBS" /></Field>
        <p className="text-xs text-slate-500 sm:col-span-6">Approval by the Chairperson, Facilitation Committee replaces the signature and stamp on the paper form. Your volunteer pass is emailed once approved.</p>
      </>}
      <div className="sm:col-span-6"><button className="btn-primary" disabled={loading}>{loading ? "Submitting…" : "Submit registration"}</button></div>
    </form>
  );
}
