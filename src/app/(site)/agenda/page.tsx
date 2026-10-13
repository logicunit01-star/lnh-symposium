import { getProgramme, seatsTaken } from "@/lib/queries";
import { getEvent, isEarlyBird } from "@/lib/event";
import { PageHero } from "@/components/ui/PageHero";
import { AgendaTabs } from "./AgendaTabs";
import { SessionCard } from "@/components/site/SessionCard";
import { fmtDate, fmtTime } from "@/lib/utils";

export const metadata = { title: "Agenda" };

export default async function Agenda() {
  const [ev, prog, taken] = await Promise.all([getEvent(), getProgramme(), seatsTaken()]);
  const early = isEarlyBird(ev);
  const days = [...new Set(prog.map((p) => p.day))];
  const theme: Record<number, string> = { 1: "Cost", 2: "Quality", 3: "Technology" };
  return (
    <>
      <PageHero eyebrow="Agenda / schedule" title={<>The full <span className="text-grad">programme</span></>} sub="All times are Pakistan Standard Time (PKT). The programme is subject to change." />
      <div className="container-x">
        <AgendaTabs
          tabs={days.map((d) => ({ key: String(d), label: `Day ${d}`, sub: `${fmtDate(prog.find((p) => p.day === d)!.startsAt, { weekday: "short", day: "numeric", month: "short" })} · ${theme[d] ?? ""}` }))}
          panels={days.map((d) => (
            <ol key={d} className="relative space-y-4 border-l border-white/10 pl-6 sm:pl-10">
              {prog.filter((p) => p.day === d).map((p) => (
                <li key={p.id} className="relative">
                  <span className="absolute -left-[31px] top-7 h-3 w-3 rounded-full bg-lnh-red ring-4 ring-ink sm:-left-[47px]" />
                  <p className="mb-2 font-mono text-xs text-lnh-sky">{fmtTime(p.startsAt)} — {fmtTime(p.endsAt)}</p>
                  {p.type === "BREAK" ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-6 py-4 text-sm text-slate-400">☕ {p.title} · {p.hall}</div>
                  ) : (
                    <SessionCard s={p} taken={taken[p.id]} early={early} cta={p.registrable ? { href: `/register?s=${p.id}`, label: "Register" } : undefined} />
                  )}
                </li>
              ))}
            </ol>
          ))}
        />
      </div>
    </>
  );
}
