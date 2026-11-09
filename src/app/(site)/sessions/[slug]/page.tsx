import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Download, MapPin, Ticket } from "lucide-react";
import { getEvent } from "@/lib/event";
import { getProgrammeItem } from "@/lib/queries";
import { appUrl, fmtDate, fmtTime, SESSION_TYPE_LABEL } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { TYPE_STYLE } from "@/components/site/SessionCard";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const s = await getProgrammeItem(params.slug);
  if (!s || s.type === "WORKSHOP" || s.type === "BREAK") return { title: "Session not found" };
  const d = (s.description ?? `${SESSION_TYPE_LABEL[s.type]} session at the 9th LNH Symposium`).slice(0, 160);
  return { title: s.title, description: d, alternates: { canonical: `${appUrl()}/sessions/${s.slug}` }, openGraph: { title: s.title, description: d, url: `${appUrl()}/sessions/${s.slug}` } };
}

/** Shareable session page (release 3, audit P5). */
export default async function SessionPage({ params }: { params: { slug: string } }) {
  const [ev, s] = await Promise.all([getEvent(), getProgrammeItem(params.slug)]);
  if (!s || s.type === "WORKSHOP" || s.type === "BREAK") notFound();
  const flyer = s.proposal && s.flyerStatus === "APPROVED" && ev.programmeReleasedAt;
  return (
    <section className="relative overflow-hidden pb-10 pt-36">
      <div className="container-x max-w-4xl">
        <Link href={`/agenda?day=${s.day}`} className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" />Back to the agenda</Link>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${TYPE_STYLE[s.type]}`}>{SESSION_TYPE_LABEL[s.type]}</span>
          {s.track && <span className="chip">{s.track}</span>}
          {s.department && <span className="chip">{s.department}</span>}
        </div>
        <h1 className="h-display mt-4 text-4xl text-white sm:text-5xl">{s.title}</h1>
        <ul className="mt-6 grid gap-3 text-slate-200 sm:grid-cols-3">
          <li className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-lnh-sky" />{fmtDate(s.startsAt, { weekday: "long", day: "numeric", month: "long" })}</li>
          <li className="flex items-center gap-2"><Clock className="h-5 w-5 text-lnh-sky" />{fmtTime(s.startsAt)} – {fmtTime(s.endsAt)} PKT</li>
          {s.hall && <li className="flex items-center gap-2"><MapPin className="h-5 w-5 text-lnh-sky" />{s.venueId ? <a href={`/venues#${s.venueId}`} className="underline">{s.hall}</a> : s.hall}</li>}
        </ul>
        {s.description && <div className="prose-lnh mt-8"><p>{s.description}</p></div>}
        {s.speakers.length > 0 && (
          <div className="mt-8">
            <h2 className="font-display text-xl font-bold text-white">Speakers</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">{s.speakers.map(({ speaker, role }) => (
              <li key={speaker.id} className="hud flex items-center gap-3 p-4">
                <Avatar name={speaker.name} src={speaker.photoUrl} className="h-12 w-12 rounded-full text-[9px]" />
                <span><span className="block font-semibold text-white">{speaker.title} {speaker.name}</span><span className="text-sm text-slate-300">{[role, speaker.designation, speaker.institution].filter(Boolean).join(" · ")}</span></span>
              </li>
            ))}</ul>
          </div>
        )}
        <div className="hud mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="flex items-center gap-2 text-slate-200"><Ticket className="h-5 w-5 text-lnh-sky" />Covered by your Symposium Pass. Nothing to book for this session.</p>
          <div className="flex gap-3">
            {flyer && <a href={`/api/sessions/${s.slug}/flyer`} className="btn-ghost btn-sm"><Download className="h-4 w-4" />Flyer</a>}
            <Link href="/register#pass" className="btn-primary btn-sm">Get your pass</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
