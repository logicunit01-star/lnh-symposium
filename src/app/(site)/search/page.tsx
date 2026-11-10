import Link from "next/link";
import { Search } from "lucide-react";
import { getProgramme } from "@/lib/queries";
import { fmtDate, fmtTime, matchesAll, SESSION_TYPE_LABEL } from "@/lib/utils";

export const metadata = { title: "Search", robots: { index: false } };
export const dynamic = "force-dynamic";

/** One search box across workshops and symposium sessions (Dashboard Findings, 9 Nov: "Add an overall search filter, e.g. AI workshops or robotics"). */
export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim().slice(0, 100);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const prog = words.length ? (await getProgramme()).filter((p) => p.type !== "BREAK") : [];
  const hits = prog.filter((p) => {
    const hay = [p.title, p.description, p.department, p.track, p.hall, SESSION_TYPE_LABEL[p.type], ...p.speakers.map(({ speaker }) => speaker.name)].filter(Boolean).join(" ").toLowerCase();
    return matchesAll(hay, words);
  });
  const ws = hits.filter((p) => p.type === "WORKSHOP"), ses = hits.filter((p) => p.type !== "WORKSHOP");
  const Row = ({ p }: { p: (typeof hits)[number] }) => (
    <li><Link href={`/${p.type === "WORKSHOP" ? "workshops" : "sessions"}/${p.slug}`} className="flex min-h-[56px] flex-col justify-center gap-0.5 px-4 py-3 hover:bg-white/[0.04]">
      <span className="text-white">{p.title}</span>
      <span className="text-xs text-slate-400">{SESSION_TYPE_LABEL[p.type]}{p.department ? ` · ${p.department}` : ""} · {fmtDate(p.startsAt, { weekday: "short", day: "numeric", month: "short" })}, {fmtTime(p.startsAt)}{p.hall ? ` · ${p.hall}` : ""}</span>
    </Link></li>
  );
  return (
    <section className="container-x max-w-3xl pb-10 pt-32">
      <p className="eyebrow">Search</p>
      <h1 className="h-display mt-4 text-4xl text-white sm:text-5xl">Find a workshop or session</h1>
      <form action="/search" role="search" className="relative mt-6">
        <label htmlFor="q" className="sr-only">Search</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input id="q" name="q" type="search" defaultValue={q} autoFocus placeholder="e.g. AI, robotics, ultrasound, cardiology" className="input pl-11 pr-28" />
        <button className="btn-primary btn-sm absolute right-1.5 top-1/2 -translate-y-1/2">Search</button>
      </form>
      {q && <p className="mt-4 text-sm text-slate-300" aria-live="polite">{hits.length} result{hits.length === 1 ? "" : "s"} for “{q}”.</p>}
      {ws.length > 0 && <div className="mt-8"><h2 className="font-display text-lg font-bold text-white">Workshops ({ws.length})</h2><ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10">{ws.map((p) => <Row key={p.id} p={p} />)}</ul></div>}
      {ses.length > 0 && <div className="mt-8"><h2 className="font-display text-lg font-bold text-white">Symposium sessions ({ses.length})</h2><ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10">{ses.map((p) => <Row key={p.id} p={p} />)}</ul></div>}
      {q && !hits.length && <p className="mt-8 text-slate-400">Nothing matches. Try a shorter word, or browse the <Link href="/workshops" className="text-lnh-sky underline">workshops</Link> and the <Link href="/agenda" className="text-lnh-sky underline">agenda</Link>.</p>}
    </section>
  );
}
