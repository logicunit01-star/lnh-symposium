import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";

export const metadata = { title: "Awards" };

/**
 * "9th LNH Symposium Awards 16.11.2026": five awards with LNH's descriptions and the award icons supplied
 * (lnh_symposium_award_icons.zip, drawn here with the theme colour instead of the file's fixed navy). Same card layout.
 */
const Svg = ({ children, className }: { children: React.ReactNode; className: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{children}</svg>
);
const Innovation = (p: { className: string }) => <Svg {...p}><path d="M9 18h6M10 22h4M8.5 14.5a6 6 0 1 1 7 0c-.9.7-1.5 1.6-1.5 2.5h-4c0-.9-.6-1.8-1.5-2.5Z" /><path d="M12 2v2M4.9 4.9l1.4 1.4M19.1 4.9l-1.4 1.4M3 12h2M19 12h2" /></Svg>;
const Research = (p: { className: string }) => <Svg {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 5.5v16M8 7h8M8 11h8M8 15h5" /></Svg>;
const Trophy = (p: { className: string }) => <Svg {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4" /><path d="M10 8h4" /></Svg>;
const Quality = (p: { className: string }) => <Svg {...p}><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m8.5 11.5 2.3 2.3 4.8-5" /></Svg>;
const Consultant = (p: { className: string }) => <Svg {...p}><circle cx="10" cy="8" r="4" /><path d="M3 21v-1a7 7 0 0 1 14 0v1" /><path d="m17 10 2 2 4-4" /></Svg>;

const AWARDS = [
  { I: Innovation, t: "Azam Ali Award", d: "Recognizes departments that have introduced the highest number of new services over the last two years.", c: "text-lnh-gold" },
  { I: Research, t: "Research Award", d: "Recognizes departments demonstrating outstanding research contributions and publications over the last two years.", c: "text-lnh-sky" },
  { I: Trophy, t: "Anjum Rizvi Award", d: "Recognizes departments that have made the most significant positive impact on the hospital and contributed to its progressive development over the last two years. This award includes both clinical and administrative categories.", c: "text-lnh-rose" },
  { I: Quality, t: "Quality Compliance Award", d: "Recognizes departments demonstrating the highest level of compliance, with the least number of non-conformities in internal quality audits over the last two years.", c: "text-lnh-cyan" },
  { I: Consultant, t: "Young Consultant Award", d: "Recognizes young consultants for their outstanding professional performance, academic contributions, dedication, and excellence in their respective specialties.", c: "text-lnh-gold" },
];

export default function Awards() {
  return (
    <>
      <PageHero eyebrow="Awards" title={<>Recognising <span className="text-grad-red">excellence</span></>}
        sub="Recognising outstanding contributions to innovation, research, quality, institutional progress, and clinical excellence." />
      <div className="container-x grid gap-5 pb-16 md:grid-cols-2 lg:grid-cols-3">
        {AWARDS.map(({ I, t, d, c }, i) => (
          <Reveal key={t} delay={i * 100} className="card card-hover p-8">
            <I className={`h-10 w-10 ${c}`} />
            <h2 className="h-display mt-8 text-2xl text-white">{t}</h2>
            <p className="mt-3 text-slate-400">{d}</p>
          </Reveal>
        ))}
      </div>
    </>
  );
}
