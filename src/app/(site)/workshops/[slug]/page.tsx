import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, CalendarDays, Clock, Download, MapPin, Users } from "lucide-react";
import { getEvent, isEarlyBird } from "@/lib/event";
import { getProgrammeItem, seatsTaken } from "@/lib/queries";
import { toWorkshopDTO } from "@/lib/workshops";
import { appUrl, pkr } from "@/lib/utils";
import { AddTicket, OrderBar } from "@/components/cart/CartDrawer";
import { CartPanel } from "@/components/cart/CartPanel";
import { deptHue } from "@/components/site/dept-hue";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const w = await getProgrammeItem(params.slug);
  if (!w || w.type !== "WORKSHOP") return { title: "Workshop not found" };
  const d = (w.description ?? "").slice(0, 160);
  return { title: w.title, description: d, alternates: { canonical: `${appUrl()}/workshops/${w.slug}` }, openGraph: { title: w.title, description: d, url: `${appUrl()}/workshops/${w.slug}` } };
}

/** Shareable workshop page (release 3, audit P5): everything about one workshop and its ticket. */
export default async function WorkshopPage({ params }: { params: { slug: string } }) {
  const [ev, s, taken] = await Promise.all([getEvent(), getProgrammeItem(params.slug), seatsTaken()]);
  if (!s || s.type !== "WORKSHOP") notFound();
  const w = toWorkshopDTO(s, taken, isEarlyBird(ev));
  const full = w.left === 0;
  return (
    <section className="relative overflow-hidden pb-28 pt-36 lg:pb-10">
      <div className="container-x grid gap-8 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <Link href="/workshops" className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-slate-300 hover:text-white"><ArrowLeft className="h-4 w-4" />All workshops</Link>
          <div className="mt-4 flex flex-wrap gap-2">
            {w.department && <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${deptHue(w.department)}`}>{w.department}</span>}
            {w.format && <span className="chip">{w.format}</span>}
            <span className="chip">Separate ticket · no pass needed</span>
          </div>
          <h1 className="h-display mt-4 text-4xl text-white sm:text-5xl">{w.title}</h1>
          <ul className="mt-6 grid gap-3 text-slate-200 sm:grid-cols-2">
            <li className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-lnh-sky" />{w.dateLabel}</li>
            <li className="flex items-center gap-2"><Clock className="h-5 w-5 text-lnh-sky" />{w.timeLabel} PKT</li>
            {w.hall && <li className="flex items-center gap-2"><MapPin className="h-5 w-5 text-lnh-sky" />{w.venueId ? <a href={`/venues#${w.venueId}`} className="underline">{w.hall}</a> : w.hall}{w.building ? `, ${w.building}` : ""}</li>}
            {w.cme != null && <li className="flex items-center gap-2"><Award className="h-5 w-5 text-lnh-gold" />{w.cme} CME hours</li>}
            {w.capacity != null && <li className="flex items-center gap-2"><Users className="h-5 w-5 text-lnh-sky" />{full ? "Fully booked" : `${w.left} of ${w.capacity} seats left`}</li>}
          </ul>
          {w.description && <div className="prose-lnh mt-8 max-w-3xl"><p>{w.description}</p></div>}
          {w.faculty.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-xl font-bold text-white">Faculty</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">{w.faculty.map((f) => (
                <li key={f.name} className="hud p-4"><p className="font-semibold text-white">{f.name}{f.degrees ? `, ${f.degrees}` : ""}</p><p className="text-sm text-slate-300">{[f.role, f.designation].filter(Boolean).join(" · ")}</p></li>
              ))}</ul>
            </div>
          )}
          <div className="hud mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
            <div><p className="text-xs uppercase tracking-widest text-slate-300">Workshop ticket</p><p className="font-display text-3xl font-bold text-white">{pkr(w.fee)}</p></div>
            <div className="flex flex-wrap items-center gap-3">
              <a href={`/api/workshops/${w.slug}/flyer`} className="btn-ghost btn-sm"><Download className="h-4 w-4" />Flyer</a>
              {full ? <Link href={`/workshops#${w.slug}`} className="btn-ghost">Join the waitlist</Link> : <AddTicket item={{ id: w.id, title: w.title, kind: "WORKSHOP", fee: w.fee, when: w.dateLabel, tag: w.department }} />}
            </div>
          </div>
        </div>
        <aside className="hidden lg:col-span-4 lg:block"><div className="lg:sticky lg:top-28"><CartPanel /></div></aside>
      </div>
      <OrderBar />
    </section>
  );
}
