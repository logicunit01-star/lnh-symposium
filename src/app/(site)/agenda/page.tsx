import Link from "next/link";
import { getProgramme, seatsTaken } from "@/lib/queries";
import { getEvent, isEarlyBird, eventDays, DAY_THEMES } from "@/lib/event";
import { PageHero } from "@/components/ui/PageHero";
import { AgendaTabs } from "./AgendaTabs";
import { SessionCard } from "@/components/site/SessionCard";
import { cn, fmtDate, fmtTime, SESSION_TYPE_LABEL } from "@/lib/utils";

export const metadata = { title: "Agenda", description: "Day-by-day programme of the 9th LNH Symposium: keynotes, plenaries, scientific sessions, panels and pre-conference workshops." };
const TYPES = ["KEYNOTE", "PLENARY", "SCIENTIFIC", "PANEL", "CEREMONY", "WORKSHOP"];

/** Agenda (release 3): sessions grouped by start time, parallel halls side by side; filters by type and hall (audit P1, P3, P4). */
export default async function Agenda({ searchParams }: { searchParams: { type?: string; hall?: string; day?: string } }) {
  const [ev, all, taken] = await Promise.all([getEvent(), getProgramme(), seatsTaken()]);
  const early = isEarlyBird(ev);
  const type = TYPES.includes(String(searchParams.type).toUpperCase()) ? String(searchParams.type).toUpperCase() : "";
  const hall = searchParams.hall ?? "";
  const halls = [...new Set(all.filter((p) => p.type !== "BREAK").map((p) => p.hall).filter(Boolean))].sort() as string[];
  const prog = all.filter((p) => (!type || p.type === type || (p.type === "BREAK" && !hall && !type)) && (!hall || p.hall === hall));
  const days = [...new Set(all.map((p) => p.day))].sort((a, b) => (a === 0 ? 99 : a) - (b === 0 ? 99 : b));
  const evDays = eventDays(ev);
  const label = (d: number) => d === 0 ? "Workshops" : `Day ${d}`;
  const sub = (d: number) => {
    if (d === 0) { const ws = all.filter((p) => p.day === 0); return `Pre-conference · ${fmtDate(ws[0].startsAt, { day: "numeric", month: "short" })} – ${fmtDate(ws.at(-1)!.startsAt, { day: "numeric", month: "short" })}`; }
    const dt = evDays[d - 1] ?? all.find((p) => p.day === d)!.startsAt;
    return `${fmtDate(dt, { weekday: "short", day: "numeric", month: "short" })} · ${DAY_THEMES[d] ?? ""}`;
  };
  const q = (k: "type" | "hall", v: string) => {
    const p = new URLSearchParams(); const t = k === "type" ? v : type; const h = k === "hall" ? v : hall;
    if (t) p.set("type", t.toLowerCase()); if (h) p.set("hall", h);
    const s = p.toString(); return `/agenda${s ? `?${s}` : ""}`;
  };
  // group a day's sessions into time slots; workshops (day 0) by date + time
  const slots = (d: number) => {
    const out: { key: string; at: Date; end: Date; items: typeof prog }[] = [];
    for (const p of prog.filter((x) => x.day === d)) {
      const key = `${p.startsAt.toISOString()}`;
      const g = out.find((x) => x.key === key);
      if (g) { g.items.push(p); if (p.endsAt > g.end) g.end = p.endsAt; } else out.push({ key, at: p.startsAt, end: p.endsAt, items: [p] });
    }
    return out;
  };
  return (
    <>
      <PageHero eyebrow="Agenda / schedule" title={<>The full <span className="text-grad">programme</span></>} sub="Pre-conference workshops followed by three symposium days on AI, Robotics and Digitization. All times are Pakistan Standard Time (PKT); the programme is subject to change. Your Symposium Pass covers every symposium session; workshops are separate tickets." />
      <div className="container-x">
        {/* filters */}
        <nav aria-label="Filter the agenda" className="mb-8 flex flex-wrap items-center gap-2">
          <Link href={q("type", "")} aria-current={!type ? "page" : undefined} className={cn("inline-flex min-h-[40px] items-center rounded-full border px-4 text-sm", !type ? "border-lnh-sky bg-lnh-sky/15 font-semibold text-white" : "border-white/20 text-slate-200 hover:border-white/50")}>All types</Link>
          {TYPES.map((t) => (
            <Link key={t} href={q("type", t)} aria-current={type === t ? "page" : undefined} className={cn("inline-flex min-h-[40px] items-center rounded-full border px-4 text-sm", type === t ? "border-lnh-sky bg-lnh-sky/15 font-semibold text-white" : "border-white/20 text-slate-200 hover:border-white/50")}>{SESSION_TYPE_LABEL[t]}{t === "WORKSHOP" ? "s" : ""}</Link>
          ))}
          <form action="/agenda" className="ml-auto flex items-center gap-2">
            {type && <input type="hidden" name="type" value={type.toLowerCase()} />}
            <label htmlFor="hall" className="sr-only">Hall</label>
            <select id="hall" name="hall" defaultValue={hall} className="input min-h-[40px] py-2">
              <option value="">All halls</option>{halls.map((h) => <option key={h}>{h}</option>)}
            </select>
            <button className="btn-ghost btn-sm">Apply</button>
          </form>
        </nav>
        {(type || hall) && <p className="-mt-4 mb-6 text-sm text-slate-300">Showing {type ? SESSION_TYPE_LABEL[type].toLowerCase() + " sessions" : "all sessions"}{hall ? ` in ${hall}` : ""}. <Link href="/agenda" className="text-lnh-sky underline">Clear filters</Link></p>}
        <AgendaTabs
          initial={Math.max(0, days.indexOf(type === "WORKSHOP" ? 0 : Number(searchParams.day) || days[0]))}
          tabs={days.map((d) => ({ key: String(d), label: label(d), sub: sub(d) }))}
          panels={days.map((d) => {
            const list = slots(d);
            if (!list.length) return <p key={d} className="hud p-8 text-center text-slate-300">Nothing matches these filters on this day. <Link href="/agenda" className="text-lnh-sky underline">Clear filters</Link></p>;
            return (
              <ol key={d} className="relative space-y-6 border-l border-white/15 pl-6 sm:pl-10">
                {list.map((g) => {
                  const real = g.items.filter((p) => p.type !== "BREAK");
                  return (
                    <li key={g.key} className="relative">
                      <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-lnh-red ring-4 ring-ink sm:-left-[47px]" />
                      <p className="mono mb-2 text-sm text-lnh-sky">{d === 0 ? `${fmtDate(g.at, { weekday: "short", day: "numeric", month: "short" })} · ` : ""}{fmtTime(g.at)} — {fmtTime(g.end)}{real.length > 1 && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-200">{real.length} in parallel</span>}</p>
                      <div className={cn("grid gap-4", real.length > 1 && "md:grid-cols-2", real.length > 2 && "xl:grid-cols-3")}>
                        {g.items.map((p) => p.type === "BREAK"
                          ? <div key={p.id} className="rounded-2xl border border-dashed border-white/15 px-6 py-4 text-sm text-slate-300 md:col-span-full">☕ {p.title} · {p.hall}</div>
                          : <SessionCard key={p.id} s={p} taken={taken[p.id]} early={early} href={`/${p.type === "WORKSHOP" ? "workshops" : "sessions"}/${p.slug}`} />)}
                      </div>
                    </li>
                  );
                })}
              </ol>
            );
          })}
        />
      </div>
    </>
  );
}
