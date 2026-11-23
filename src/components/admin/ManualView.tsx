"use client";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronRight, Lightbulb, MapPin, Printer, Search, X } from "lucide-react";
import type { ManualChapter, ManualSection } from "@/lib/manual";
import { cn } from "@/lib/utils";

/** Admin → Training Manual (23 Nov 2026): searchable user guide; each section is one feature or setting. */
const norm = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
const textOf = (s: ManualSection) => norm([s.title, s.where, s.summary, ...(s.steps ?? []), ...(s.fields ?? []).flat(), ...(s.tips ?? []), s.keywords].filter(Boolean).join(" "));

function Hi({ text, words }: { text: string; words: string[] }) {
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return <>{text.split(re).map((p, i) => (i % 2 ? <mark key={i} className="rounded-sm bg-amber-200/80 text-slate-900">{p}</mark> : p))}</>;
}

type Sec = ManualSection & { mine: boolean };
type Chap = Omit<ManualChapter, "sections"> & { sections: Sec[] };

export function ManualView({ chapters, allowed }: { chapters: Chap[]; allowed: boolean }) {
  const [q, setQ] = useState("");
  const [mine, setMine] = useState(false);
  useEffect(() => { try { setMine(localStorage.getItem("manual-mine") === "1"); } catch { /* storage unavailable */ } }, []);
  const toggleMine = (v: boolean) => { setMine(v); try { localStorage.setItem("manual-mine", v ? "1" : "0"); } catch { /* storage unavailable */ } };
  // "/" focuses the search box
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "/" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); document.getElementById("manual-q")?.focus(); } };
    window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f);
  }, []);
  const words = useMemo(() => norm(q).split(/\s+/).filter((w) => w.length > 1), [q]);
  const shown = useMemo(() => chapters.map((c) => ({
    ...c,
    sections: c.sections.filter((s) => (!mine || s.mine) && (!words.length || words.every((w) => textOf(s).includes(w) || norm(c.title).includes(w)))),
  })).filter((c) => c.sections.length), [chapters, mine, words]);
  const total = shown.reduce((a, c) => a + c.sections.length, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
      {/* contents */}
      <nav aria-label="Contents" className="print:hidden">
        <div className="lg:sticky lg:top-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Contents</p>
          <ol className="space-y-1 text-sm">
            {shown.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-lnh-blue"><span className="w-4 text-xs text-slate-400">{chapters.findIndex((x) => x.id === c.id) + 1}</span>{c.title}<span className="ml-auto text-xs text-slate-400">{c.sections.length}</span></a>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <div className="min-w-0">
        <div className="a-card sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-3 p-3 lg:top-2 print:hidden">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search the manual</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input id="manual-q" type="text" role="searchbox" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. refund, seat hold, WhatsApp" className="a-input pl-9 pr-9" autoComplete="off" />
            {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
          </label>
          {allowed && <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={mine} onChange={(e) => toggleMine(e.target.checked)} />Only what my login can use</label>}
          <button type="button" onClick={() => window.print()} className="a-btn-ghost"><Printer className="h-4 w-4" />Print / PDF</button>
          <p className="w-full text-xs text-slate-500" aria-live="polite">{words.length || mine ? `${total} topic${total === 1 ? "" : "s"} found` : `${total} topics in ${shown.length} chapters`}</p>
        </div>

        {!total && <div className="a-card p-10 text-center text-slate-500"><BookOpen className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3">Nothing matches “{q}”. Try a shorter word, or clear the search.</p></div>}

        <div className="space-y-10">
          {shown.map((c, ci) => (
            <section key={c.id} id={c.id} className="scroll-mt-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-lnh-blue">Chapter {chapters.findIndex((x) => x.id === c.id) + 1}</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">{c.title}</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">{c.intro}</p>
              <div className="mt-5 space-y-4">
                {c.sections.map((s) => (
                  <article key={s.id} id={s.id} className="a-card scroll-mt-24 break-inside-avoid p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-bold text-slate-900"><a href={`#${s.id}`} className="hover:text-lnh-blue"><Hi text={s.title} words={words} /></a></h3>
                      {!s.mine && allowed && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">Not in your login</span>}
                    </div>
                    {s.where && <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" /><Hi text={s.where} words={words} /></p>}
                    <p className="mt-3 text-sm leading-relaxed text-slate-700"><Hi text={s.summary} words={words} /></p>
                    {s.steps && <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">{s.steps.map((t, i) => <li key={i}><Hi text={t} words={words} /></li>)}</ol>}
                    {s.fields && (
                      <dl className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
                        {s.fields.map(([k, v]) => (
                          <div key={k} className="grid gap-1 px-3 py-2 sm:grid-cols-[220px_1fr] sm:gap-4">
                            <dt className="flex items-start gap-1 text-sm font-semibold text-slate-800"><ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lnh-blue" /><Hi text={k} words={words} /></dt>
                            <dd className="text-sm text-slate-600"><Hi text={v} words={words} /></dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {s.tips && (
                      <div className="mt-3 rounded-lg bg-sky-50 px-3 py-2">
                        {s.tips.map((t, i) => <p key={i} className="flex gap-2 py-0.5 text-sm text-sky-900"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /><Hi text={t} words={words} /></p>)}
                      </div>
                    )}
                  </article>
                ))}
              </div>
              {ci < shown.length - 1 && <p className="mt-4 text-right text-xs print:hidden"><a href="#top" className="text-lnh-blue hover:underline">Back to top</a></p>}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
