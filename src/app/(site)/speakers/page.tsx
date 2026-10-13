import { Linkedin, MapPin } from "lucide-react";
import { getSpeakers } from "@/lib/queries";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { Avatar } from "@/components/ui/Avatar";
import { fmtDate, fmtTime } from "@/lib/utils";

export const metadata = { title: "Speakers" };

export default async function Speakers() {
  const speakers = await getSpeakers();
  return (
    <>
      <PageHero eyebrow={`${speakers.length} speakers`} title={<>Meet the <span className="text-grad-red">speakers</span></>} sub="Keynote speakers, panelists and workshop facilitators from Pakistan and abroad." />
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
