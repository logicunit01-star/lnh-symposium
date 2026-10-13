import { Mail, Phone, MapPin } from "lucide-react";
import { getEvent } from "@/lib/event";
import { PageHero } from "@/components/ui/PageHero";
import { ContactForm } from "./ContactForm";

export const metadata = { title: "Contact Us" };

export default async function Contact() {
  const ev = await getEvent();
  return (
    <>
      <PageHero eyebrow="Contact us" title={<>Get in <span className="text-grad">touch</span></>} sub="Questions about registration, abstracts, workshops or sponsorship? The symposium secretariat is here to help." />
      <div className="container-x grid gap-8 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          {[
            { I: Mail, t: "Email", v: ev.contactEmail, h: `mailto:${ev.contactEmail}` },
            { I: Phone, t: "Phone", v: ev.contactPhone, h: `tel:${ev.contactPhone.replace(/\s/g, "")}` },
            { I: MapPin, t: "Venue", v: ev.venue },
          ].map(({ I, t, v, h }) => (
            <div key={t} className="card flex gap-4 p-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lnh-red/15"><I className="h-5 w-5 text-lnh-rose" /></span>
              <div><p className="text-xs uppercase tracking-widest text-slate-500">{t}</p>{h ? <a href={h} className="font-medium text-white hover:text-lnh-sky">{v}</a> : <p className="font-medium text-white">{v}</p>}</div>
            </div>
          ))}
          <div className="overflow-hidden rounded-3xl border border-white/10">
            <iframe title="Map" className="h-64 w-full invert-[90%] hue-rotate-180" loading="lazy" src="https://www.google.com/maps?q=Liaquat+National+Hospital,+Stadium+Road,+Karachi&output=embed" />
          </div>
        </div>
        <div className="card p-6 sm:p-10 lg:col-span-3"><ContactForm /></div>
      </div>
    </>
  );
}
