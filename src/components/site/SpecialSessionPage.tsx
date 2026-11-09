import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { getEvent } from "@/lib/event";
import { getProgramme } from "@/lib/queries";
import { publicPeople } from "@/lib/programme-pages";
import { fmtDate, fmtTime } from "@/lib/utils";
import { PageHero } from "@/components/ui/PageHero";
import { SessionAgenda } from "./SessionAgenda";

/** Plenary and Debate pages (Dashboard Instructions, revised 06-11-2026, Public Dashboard point 4). */
export async function SpecialSessionPage({ kind }: { kind: "PLENARY" | "DEBATE" }) {
  const [ev, prog] = await Promise.all([getEvent(), getProgramme({ types: ["PLENARY", "PANEL"] })]);
  const list = prog.filter((p) => p.sessionFormat === kind);
  const people = await publicPeople(list.map((p) => p.id));
  const slots = ev.sessionSlots.filter((x) => x.special === kind);
  const label = kind === "PLENARY" ? "Plenary Session" : "Debate Session";
  const D = (d: string) => fmtDate(new Date(`${d}T12:00:00+05:00`), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <>
      <PageHero eyebrow="Programme" title={<>{kind === "PLENARY" ? "Plenary" : "Debate"} <span className="text-grad">session</span></>}
        sub={kind === "PLENARY" ? "The symposium's plenary session, with a keynote speaker, panelists and a moderator." : "The symposium's debate session, with a keynote speaker, panelists and a moderator."} />
      <div className="container-x max-w-4xl space-y-8">
        {list.length ? list.map((s) => (
          <article key={s.id} className="hud p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold text-white"><Link href={`/sessions/${s.slug}`} className="hover:underline">{s.title}</Link></h2>
            <ul className="mt-4 grid gap-3 text-slate-200 sm:grid-cols-3">
              <li className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-lnh-sky" />{fmtDate(s.startsAt, { weekday: "long", day: "numeric", month: "long" })}</li>
              <li className="flex items-center gap-2"><Clock className="h-5 w-5 text-lnh-sky" />{fmtTime(s.startsAt)} – {fmtTime(s.endsAt)} PKT</li>
              {s.hall && <li className="flex items-center gap-2"><MapPin className="h-5 w-5 text-lnh-sky" />{s.venueId ? <a href={`/venues#${s.venueId}`} className="underline">{s.hall}</a> : s.hall}</li>}
            </ul>
            {s.description && <p className="mt-6 text-slate-300">{s.description}</p>}
            <SessionAgenda people={people[s.id] ?? []} />
          </article>
        )) : (
          <div className="hud p-8">
            <h2 className="font-display text-2xl font-bold text-white">{label}</h2>
            {slots.length > 0 && <ul className="mt-4 space-y-1 text-slate-200">{slots.map((x) => <li key={x.key} className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-lnh-sky" />{D(x.day)} · {x.start}–{x.end} PKT</li>)}</ul>}
            <p className="mt-4 text-slate-300">The keynote speaker, panelists and moderator will be announced here once the Scientific Committee finalises the agenda.</p>
          </div>
        )}
        <p className="text-sm text-slate-400">Covered by your Symposium Pass. <Link href="/agenda" className="text-lnh-sky underline">See the full agenda</Link></p>
      </div>
    </>
  );
}
