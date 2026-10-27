"use client";
import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { onsiteRegister, type DeskResult } from "@/app/admin/onsite/actions";
import { cn, pkr } from "@/lib/utils";

type Cat = { id: number; label: string; fee: number; tier: string };
type Item = { id: string; title: string; when: string; fee: number; left: number | null; kind: string };
const TITLES = ["Prof.", "Assoc. Prof.", "Asst. Prof.", "Lecturer", "Dr.", "Mr.", "Ms."];
const maskPhone = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 11); return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d; };

function Go() { const { pending } = useFormStatus(); return <button disabled={pending} className="a-btn-red w-full py-3 text-base">{pending ? "Registering…" : "Register and issue pass"}</button>; }

export function OnsiteForm({ cats, items, procPct }: { cats: Cat[]; items: Item[]; procPct: number }) {
  const [state, action] = useFormState<DeskResult, FormData>(onsiteRegister, null);
  const emp = cats.find((c) => c.tier === "EMPLOYEE") ?? cats[0];
  const [catId, setCatId] = useState(emp?.id);
  const [pass, setPass] = useState(true);
  const [sel, setSel] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [pay, setPay] = useState("CASH");
  const cat = cats.find((c) => c.id === catId);
  const sub = (pass ? cat?.fee ?? 0 : 0) + items.filter((i) => sel.includes(i.id)).reduce((a, i) => a + i.fee, 0);
  const total = sub + Math.round((sub * (procPct || 0)) / 100);
  const fe = state?.fields ?? {};
  const err = (k: string) => fe[k] && <p className="mt-1 text-xs text-rose-600">{fe[k]}</p>;
  const groups = useMemo(() => [["WORKSHOP", "Workshops"], ["SESSION", "Symposium sessions"]] as const, []);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {state?.error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{state.error}</p>}
        <section className="a-card grid gap-4 p-5 sm:grid-cols-6">
          <h2 className="font-display text-base font-bold sm:col-span-6">Participant</h2>
          <div className="sm:col-span-1"><label className="a-label">Title</label><select name="title" defaultValue="Dr." className="a-input">{TITLES.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="sm:col-span-1"><label className="a-label">Gender</label><select name="gender" required defaultValue="" className="a-input"><option value="" disabled>—</option><option>Male</option><option>Female</option></select>{err("gender")}</div>
          <div className="sm:col-span-2"><label className="a-label">First name</label><input name="firstName" required maxLength={50} className="a-input" />{err("firstName")}</div>
          <div className="sm:col-span-2"><label className="a-label">Last name</label><input name="lastName" required maxLength={50} className="a-input" />{err("lastName")}</div>
          <div className="sm:col-span-3"><label className="a-label">Email</label><input name="email" type="email" required className="a-input" />{err("email")}</div>
          <div className="sm:col-span-3"><label className="a-label">Mobile</label><input name="phone" required inputMode="numeric" placeholder="03XX-XXXXXXX" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} className="a-input font-mono" />{err("phone")}</div>
          <div className="sm:col-span-2"><label className="a-label">LNH employee ID {cat?.tier === "EMPLOYEE" && <span className="text-rose-600">*</span>}</label><input name="employeeId" className="a-input font-mono" placeholder="e.g. 10452" />{err("employeeId")}</div>
          <div className="sm:col-span-2"><label className="a-label">Department</label><input name="department" className="a-input" /></div>
          <div className="sm:col-span-2"><label className="a-label">Designation</label><input name="designation" className="a-input" /></div>
          <div className="sm:col-span-3"><label className="a-label">PMDC no. (optional)</label><input name="pmdcNo" className="a-input" /></div>
          <div className="sm:col-span-3"><label className="a-label">Institution</label><input name="institution" defaultValue="Liaquat National Hospital" className="a-input" /></div>
        </section>

        <section className="a-card p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[240px] flex-1"><label className="a-label">Registration category</label>
              <select name="categoryId" value={catId} onChange={(e) => setCatId(Number(e.target.value))} className="a-input">{cats.map((c) => <option key={c.id} value={c.id}>{c.label} — {pkr(c.fee)}</option>)}</select></div>
            <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="includePass" checked={pass} onChange={(e) => setPass(e.target.checked)} />Symposium pass</label>
          </div>
          {groups.map(([k, label]) => {
            const list = items.filter((i) => (k === "WORKSHOP") === (i.kind === "WORKSHOP"));
            if (!list.length) return null;
            return (
              <div key={k} className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {list.map((i) => {
                    const full = i.left === 0, on = sel.includes(i.id);
                    return (
                      <li key={i.id}><label className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition", on ? "border-lnh-blue bg-lnh-blue/5" : "border-slate-200 hover:border-slate-300", full && "cursor-not-allowed opacity-50")}>
                        <input type="checkbox" name="sessionIds" value={i.id} disabled={full} checked={on} onChange={(e) => setSel((s) => e.target.checked ? [...s, i.id] : s.filter((x) => x !== i.id))} className="mt-0.5" />
                        <span className="flex-1"><span className="font-medium text-slate-800">{i.title}</span><span className="block text-xs text-slate-500">{i.when} · {i.left == null ? "open" : full ? "full" : `${i.left} seats left`}</span></span>
                        <span className="whitespace-nowrap text-xs font-semibold">{i.fee ? pkr(i.fee) : "Free"}</span>
                      </label></li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      </div>

      <aside className="a-card h-fit space-y-4 p-5 lg:sticky lg:top-6">
        <h2 className="font-display text-base font-bold">Payment</h2>
        <div className="grid grid-cols-2 gap-2">
          {[["CASH", "Cash"], ["CARD", "Card machine"], ["WAIVED", "Waived"], ["PENDING", "Pay later"]].map(([v, l]) => (
            <label key={v} className={cn("cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-semibold", pay === v ? "border-lnh-navy bg-lnh-navy text-white" : "border-slate-200 text-slate-600")}>
              <input type="radio" name="payment" value={v} checked={pay === v} onChange={() => setPay(v)} className="sr-only" />{l}</label>
          ))}
        </div>
        {(pay === "CASH" || pay === "CARD") && <div><label className="a-label">Receipt no. (optional)</label><input name="receipt" className="a-input" /></div>}
        <dl className="space-y-1 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{pkr(sub)}</dd></div>
          {procPct > 0 && <div className="flex justify-between"><dt className="text-slate-500">Tax & processing ({procPct}%)</dt><dd>{pkr(total - sub)}</dd></div>}
          <div className="flex justify-between text-lg font-bold"><dt>Total</dt><dd>{pay === "WAIVED" ? <><s className="mr-2 text-sm font-normal text-slate-400">{pkr(total)}</s>{pkr(0)}</> : pkr(total)}</dd></div>
        </dl>
        <Go />
        <p className="text-xs text-slate-500">Same registration number series, seat caps and confirmation email/SMS as online. The QR pass opens right after.</p>
      </aside>
    </form>
  );
}
