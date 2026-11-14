import Link from "next/link";
import { Facebook, Instagram, Linkedin, Youtube, Twitter, Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import type { EventSettings } from "@/lib/db/schema";
import { HOSPITAL } from "@/lib/brand";

export function Footer({ ev }: { ev: EventSettings }) {
  const year = new Date(ev.startDate).getFullYear();
  // 14.11.2026: the same accounts and order as the LNH website footer
  const socials = [
    { href: ev.facebook, Icon: Facebook, label: "Facebook" }, { href: ev.x, Icon: Twitter, label: "X" }, { href: ev.youtube, Icon: Youtube, label: "YouTube" },
    { href: ev.linkedin, Icon: Linkedin, label: "LinkedIn" }, { href: ev.instagram, Icon: Instagram, label: "Instagram" }, { href: ev.whatsapp, Icon: MessageCircle, label: "WhatsApp" },
  ].filter((s) => s.href);
  const cols = [
    { t: "Participate", l: [["Symposium Registration", "/register"], ["Pre-symposium Workshops", "/workshops"], ["Abstract Submission", "/abstracts"], ["My Registration", "/account/bookings"], ["E-certificates", "/certificates"]] },
    { t: "Information", l: [["Agenda", "/agenda"], ["Meet the Experts", "/speakers"], ["Awards", "/awards"], ["Contact Us", "/contact"]] },
  ];
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/10 bg-ink-900">
      <div className="orb -left-40 top-10 h-96 w-96 bg-lnh-blue/20" />
      <div className="orb -right-40 bottom-0 h-96 w-96 bg-lnh-red/15 [animation-delay:-6s]" />
      <div className="container-x relative grid gap-12 py-16 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white">Contact</p>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-lnh-sky" />{ev.venue}</li>
            <li className="flex gap-3"><Mail className="h-4 w-4 text-lnh-sky" /><a href={`mailto:${ev.contactEmail}`} className="hover:text-white">{ev.contactEmail}</a></li>
            {ev.contactPhone?.trim() && <li className="flex gap-3"><Phone className="h-4 w-4 text-lnh-sky" /><a href={`tel:${ev.contactPhone.replace(/\s/g, "")}`} className="hover:text-white">{ev.contactPhone}</a></li>}
          </ul>
          {socials.length > 0 && <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-white">Follow Liaquat National Hospital</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {socials.map(({ href, Icon, label }) => (
              <a key={label} href={href!} target="_blank" rel="noreferrer" aria-label={label} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-slate-300 transition hover:border-lnh-red hover:bg-lnh-red hover:text-white"><Icon className="h-4 w-4" /></a>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 lg:col-span-4">
          {cols.map((c) => (
            <div key={c.t}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white">{c.t}</p>
              <ul className="space-y-0.5">{c.l.map(([l, h]) => <li key={h}><Link href={h} className="inline-block py-1.5 text-sm text-slate-300 transition hover:text-lnh-sky">{l}</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="lg:col-span-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white">Venue map</p>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <iframe title="Liaquat National Hospital map" className="h-56 w-full grayscale-[60%] invert-[90%] hue-rotate-180" loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps?q=Liaquat+National+Hospital,+Stadium+Road,+Karachi&output=embed" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Medical College", "Convention Centre", "College of Nursing", "School of Medical Technology", "Radiology", "RSDC"].map((h) => <a key={h} href="/venues" className="chip min-h-[32px] hover:text-white">{h}</a>)}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-6 text-xs text-slate-500 sm:flex-row">
          <p>© {year} {HOSPITAL.name}, {HOSPITAL.institute}. All rights reserved.</p>
          <a href="https://www.lnh.edu.pk/privacy-policy/website" target="_blank" rel="noreferrer" className="shrink-0 hover:text-white">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}
