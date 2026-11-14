"use client";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { WF_GROUPS, WF_OVERALL, WF_RECOMMEND, WF_SCALE, WF_STATEMENTS } from "@/lib/workshop-feedback";

type W = { slug: string; title: string; date: string; done: boolean };
const post = async (url: string, body: unknown) => {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return r.ok ? { data: j } : { error: (j.error as string) || "Something went wrong." };
};
const choice = (on: boolean) => cn("rounded-xl border px-3 py-2.5 text-sm font-semibold transition", on ? "border-lnh-sky bg-lnh-sky/15 text-white" : "border-white/10 text-slate-400 hover:border-white/30");

/** N7 (LNH answers 13 Nov 2026): workshop feedback form. Section A picks the workshop from the participant's own workshops. */
export function WorkshopFeedbackForm({ slug, token }: { slug?: string; token?: string }) {
  const [who, setWho] = useState<{ regNo: string; email: string }>({ regNo: "", email: "" });
  const [me, setMe] = useState<{ name: string; regNo: string; workshops: W[] } | null>(null);
  const [pick, setPick] = useState(slug ?? "");
  const [a, setA] = useState<(number | undefined)[]>(Array(WF_STATEMENTS.length).fill(undefined));
  const [overall, setOverall] = useState(0);
  const [rec, setRec] = useState("");
  const [contact, setContact] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ certificate: boolean; verified: boolean } | null>(null);

  const load = async (body: object) => {
    setBusy(true); setErr(null);
    const r = await post("/api/feedback/workshops/lookup", body);
    setBusy(false);
    if (r.error) return setErr(r.error);
    setMe(r.data);
    const open = (r.data.workshops as W[]).filter((w) => !w.done);
    setPick((p) => (p && open.some((w) => w.slug === p) ? p : open[0]?.slug ?? ""));
  };
  useEffect(() => { if (token) void load({ token }); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) return (
    <div className="py-8 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" /><p className="h-display mt-5 text-3xl text-white">Thank you!</p>
      <p className="mx-auto mt-2 max-w-md text-slate-300">{done.certificate ? "Your workshop certificate has been emailed to you." : done.verified ? "Your feedback is recorded." : "Your feedback is recorded. Your certificate is emailed once your department confirms your attendance."}</p>
      {me && me.workshops.filter((w) => !w.done && w.slug !== pick).length > 0 && <button className="btn-ghost mt-6" onClick={() => { setDone(null); void load(token ? { token } : who); setA(Array(WF_STATEMENTS.length).fill(undefined)); setOverall(0); setRec(""); setContact(null); }}>Give feedback for another workshop</button>}
    </div>
  );

  if (!me) return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); void load(who); }}>
      <p className="text-sm text-slate-300">Enter the registration number from your e-ticket and the email you registered with. Your workshops appear in the next step.</p>
      {err && <Alert>{err}</Alert>}
      <div><label className="label" htmlFor="wf-reg">Registration no.</label><input id="wf-reg" required value={who.regNo} onChange={(e) => setWho({ ...who, regNo: e.target.value })} className="input uppercase" placeholder="SYM-2027-00012" /></div>
      <div><label className="label" htmlFor="wf-email">Email</label><input id="wf-email" type="email" required value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} className="input" /></div>
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Finding your workshops…" : "Continue"}</button>
    </form>
  );

  const open = me.workshops.filter((w) => !w.done);
  if (!open.length) return <p className="text-slate-300">{me.workshops.length ? "Thank you, you have given feedback for all your workshops." : "No workshop on your registration has started yet. Feedback opens when the workshop starts."}</p>;
  const complete = a.every(Boolean) && overall > 0 && rec && contact !== null && pick;
  let n = 0;
  return (
    <form className="space-y-8" onSubmit={async (e) => {
      e.preventDefault(); if (!complete) return;
      setBusy(true); setErr(null);
      const fd = new FormData(e.currentTarget);
      const r = await post("/api/feedback/workshops", { ...(token ? { token } : who), slug: pick, answers: a, overall, recommend: rec, contact, comments: String(fd.get("comments") || "") });
      setBusy(false);
      if (r.error) { setErr(r.error); window.scrollTo({ top: 0, behavior: "smooth" }); } else setDone(r.data);
    }}>
      {err && <Alert>{err}</Alert>}
      <fieldset>
        <legend className="eyebrow">Section A · Workshop and participant</legend>
        <p className="mt-3 text-sm text-slate-300">{me.name} · {me.regNo}</p>
        <label className="label mt-3" htmlFor="wf-ws">Workshop title</label>
        <select id="wf-ws" value={pick} onChange={(e) => setPick(e.target.value)} className="input">{open.map((w) => <option key={w.slug} value={w.slug}>{w.title} ({w.date})</option>)}</select>
      </fieldset>

      <fieldset className="space-y-6">
        <legend className="eyebrow">Section B · Rate the workshop</legend>
        <p className="text-xs text-slate-400">1 = strongly disagree, 2 = disagree, 3 = neutral, 4 = agree, 5 = strongly agree</p>
        {WF_GROUPS.map((g) => (
          <div key={g.title} className="space-y-4">
            <p className="font-display text-base font-bold text-white">{g.title}</p>
            {g.items.map((t) => { const i = n++; return (
              <div key={i} role="radiogroup" aria-label={t}>
                <p className="mb-2 text-sm text-slate-200">{i + 1}. {t}</p>
                <div className="grid grid-cols-5 gap-1.5">{[1, 2, 3, 4, 5].map((v) => (
                  <button type="button" key={v} role="radio" aria-checked={a[i] === v} title={WF_SCALE[v - 1]} onClick={() => setA((x) => x.map((y, j) => (j === i ? v : y)))}
                    className={cn("h-11 rounded-lg border text-sm font-bold transition", a[i] === v ? "border-lnh-sky bg-lnh-sky/20 text-white" : "border-white/10 text-slate-400 hover:border-white/30")}>{v}</button>
                ))}</div>
              </div>
            ); })}
          </div>
        ))}
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="eyebrow">Section C · Overall assessment</legend>
        <div><p className="mb-2 text-sm font-medium text-white">Overall rating</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">{WF_OVERALL.map((l, i) => <button type="button" key={l} onClick={() => setOverall(i + 1)} className={choice(overall === i + 1)}>{l}</button>)}</div></div>
        <div><p className="mb-2 text-sm font-medium text-white">Would you recommend this workshop to colleagues?</p>
          <div className="grid grid-cols-3 gap-1.5">{WF_RECOMMEND.map(([k, l]) => <button type="button" key={k} onClick={() => setRec(k)} className={choice(rec === k)}>{l}</button>)}</div></div>
        <div><p className="mb-2 text-sm font-medium text-white">Would you like to be contacted for future similar activities?</p>
          <div className="grid grid-cols-2 gap-1.5">{[true, false].map((b) => <button type="button" key={String(b)} onClick={() => setContact(b)} className={choice(contact === b)}>{b ? "Yes" : "No"}</button>)}</div></div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow">Section D</legend>
        <label className="label mt-3" htmlFor="comments">Additional comments or suggestions</label><textarea id="comments" name="comments" rows={3} maxLength={2000} className="input" />
      </fieldset>
      <button className="btn-primary w-full" disabled={!complete || busy}>{busy ? "Submitting…" : complete ? "Submit feedback" : "Answer every question to submit"}</button>
    </form>
  );
}
