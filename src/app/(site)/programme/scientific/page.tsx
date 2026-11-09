import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { getEvent } from "@/lib/event";
import { getProgramme } from "@/lib/queries";
import { publicPeople } from "@/lib/programme-pages";
import { SESSION_FORMATS } from "@/lib/scientific";
import { fmtDate, fmtTime } from "@/lib/utils";
import { PageHero } from "@/components/ui/PageHero";
import { Alert } from "@/components/ui/Field";
import { SessionAgenda } from "@/components/site/SessionAgenda";

export const metadata = { title: "Scientific Sessions", description: "All scientific sessions of the 9th LNH Symposium with their full programme: chairs, speakers, panelists and research presentations." };
export const dynamic = "force-dynamic";

/** Scientific Sessions with full programme details including the agenda (Dashboard Instructions, revised 06-11-2026). */
export default async function Scientific() {
  const [ev, prog] = await Promise.all([getEvent(), getProgramme({ types: ["SCIENTIFIC", "PANEL"] })]);
  const list = prog.filter((p) => p.type === "SCIENTIFIC" || (p.type === "PANEL" && p.proposal && p.sessionFormat !== "DEBATE"));
  const people = await publicPeople(list.map((p) => p.id));
  const days = [...new Set(list.map((p) => p.day))].sort((a, b) => a - b);
  return (
    <>
      <PageHero eyebrow="Programme" title={<>Scientific <span className="text-grad">sessions</span></>}
        sub="Every speciality session with its chairs, speakers, panelists and research presentations. All sessions are covered by your Symposium Pass." />
      <div className="container-x space-y-12">
        {!ev.programmeReleasedAt && <Alert kind="info">The full scientific programme will be published here once the Scientific Committee finalises the agenda.</Alert>}
        {days.length > 1 && (
          <nav aria-label="Days" className="flex flex-wrap gap-2">
            {days.map((d) => <a key={d} href={`#day-${d}`} className="inline-flex min-h-[40px] items-center rounded-full border border-white/20 px-4 text-sm text-slate-200 hover:border-white/50">Day {d}</a>)}
          </nav>
        )}
        {days.map((d) => (
          <section key={d} id={`day-${d}`} className="scroll-mt-28">
            <h2 className="h-display mb-6 border-b border-white/10 pb-3 text-3xl text-white">Day {d} · {fmtDate(list.find((p) => p.day === d)!.startsAt, { weekday: "long", day: "numeric", month: "long" })}</h2>
            <div className="grid gap-5 lg:grid-cols-2">
              {list.filter((p) => p.day === d).map((s) => (
                <article key={s.id} className="hud p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-lnh-sky">{s.department ?? "Scientific session"}{s.sessionFormat && SESSION_FORMATS[s.sessionFormat] ? ` · ${SESSION_FORMATS[s.sessionFormat]}` : ""}</p>
                  <h3 className="mt-2 font-display text-xl font-bold text-white"><Link href={`/sessions/${s.slug}`} className="hover:underline">{s.title}</Link></h3>
                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-300">
                    <li className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-lnh-sky" />{fmtDate(s.startsAt, { weekday: "short", day: "numeric", month: "short" })}</li>
                    <li className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-lnh-sky" />{fmtTime(s.startsAt)} – {fmtTime(s.endsAt)}</li>
                    {s.hall && <li className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-lnh-sky" />{s.hall}</li>}
                  </ul>
                  <SessionAgenda people={people[s.id] ?? []} compact />
                  <Link href={`/sessions/${s.slug}`} className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-lnh-sky underline">Full session details</Link>
                </article>
              ))}
            </div>
          </section>
        ))}
        {!list.length && <p className="text-slate-400">No scientific sessions published yet.</p>}
      </div>
    </>
  );
}
