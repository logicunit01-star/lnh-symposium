import { Linkedin, MapPin } from "lucide-react";
import { getSpeakers } from "@/lib/queries";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Avatar } from "@/components/ui/Avatar";
import { fmtDate, fmtTime } from "@/lib/utils";
import { getEvent } from "@/lib/event";
import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getProgrammePage } from "@/lib/programme-pages";

export const metadata = { title: "Meet the Experts & Speakers" };
export const dynamic = "force-dynamic";

/** Meet the Experts and Speakers as one section (homepage changes 11.11.2026). Speakers show once they go live
 *  (Event Settings); experts once their page is published and the programme is released. Staff preview: ?preview=1. */
export default async function Speakers({ searchParams }: { searchParams: { preview?: string } }) {
  const [ev, speakersAll, staff, { page, guests }] = await Promise.all([getEvent(), getSpeakers(), currentUser(), getProgrammePage("EXPERTS")]);
  const pv = !!searchParams.preview && can(staff?.role, "programme");
  const speakers = ev.speakersLive || pv ? speakersAll : [];
  const experts = pv || (page.published && !!ev.programmeReleasedAt) ? guests : [];
  return (
    <>
      <PageHero eyebrow="Speakers" title={<>Meet the <span className="text-grad-red">experts &amp; speakers</span></>} sub="Guest experts, keynote speakers, panelists and workshop facilitators from Pakistan and abroad." />
      {experts.length > 0 && (
        <section id="experts" className="container-x mb-16 scroll-mt-28">
          <h2 className="h-display mb-2 text-3xl text-white">Meet the Experts</h2>
          {page.format && <p className="mb-6 whitespace-pre-line text-slate-300">{page.format}</p>}
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {experts.map((g) => (
              <li key={g.id} className="hud flex flex-col items-center p-6 text-center">
                <Avatar name={g.name} src={g.photo} className="h-32 w-32 rounded-full text-[16px]" />
                <p className="mt-4 font-display text-lg font-bold text-white">{g.name}</p>
                {g.qualification && <p className="text-sm text-lnh-sky">{g.qualification}</p>}
                {g.affiliation && <p className="mt-1 text-sm text-slate-300">{g.affiliation}</p>}
                {g.topic && <p className="mt-3 text-sm text-slate-400">{g.topic}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {!speakers.length && !experts.length && <div className="container-x"><div className="hud p-10 text-center"><p className="font-display text-2xl font-bold text-white">Coming soon</p><p className="mt-2 text-slate-300">Our experts and speakers will be announced here.</p></div></div>}
      {speakers.length > 0 && experts.length > 0 && <h2 className="container-x h-display mb-6 text-3xl text-white">Speakers</h2>}
      <div className="container-x grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {speakers.map((s, i) => (
          <Reveal key={s.id} delay={(i % 3) * 80} className="card card-hover group flex flex-col overflow-hidden" as="article">
            <div className="relative">
              <Avatar name={s.name} src={s.photoUrl} className="aspect-[16/10] w-full text-[30px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-800 to-transparent" />
              {s.featured && <span className="absolute left-4 top-4 rounded-full bg-lnh-red px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">Keynote</span>}
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h2 className="font-display text-xl font-bold text-white">{s.title} {s.name}</h2>
              <p className="text-sm text-lnh-sky">{s.designation}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5" />{s.institution}{s.country ? `, ${s.country}` : ""}</p>
              {s.topic && <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white"><span className="mb-1 block text-[10px] uppercase tracking-widest text-slate-500">Topic</span>{s.topic}</p>}
              {s.bio && <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-slate-400">{s.bio}</p>}
              {s.sessions.length > 0 && (
                <ul className="mt-4 space-y-1 text-xs text-slate-400">
                  {s.sessions.map(({ session, role }) => <li key={session.id}>• <span className="text-slate-200">{session.title}</span> — {role}, {fmtDate(session.startsAt, { day: "numeric", month: "short" })} {fmtTime(session.startsAt)}</li>)}
                </ul>
              )}
              <div className="mt-auto pt-5">
                {s.linkedin && <a href={s.linkedin} target="_blank" rel="noreferrer" className="btn-ghost btn-sm"><Linkedin className="h-4 w-4" /> LinkedIn profile</a>}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </>
  );
}
