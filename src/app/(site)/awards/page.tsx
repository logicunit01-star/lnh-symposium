import Link from "next/link";
import { Trophy, Medal, Award } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";

export const metadata = { title: "Awards" };

export default function Awards() {
  const awards = [
    { I: Trophy, t: "Best Oral Presentation", d: "First, second and third prizes across the three scientific sessions.", c: "text-lnh-gold" },
    { I: Medal, t: "Best Poster", d: "Judged on scientific merit, clarity and presentation during the poster walk.", c: "text-lnh-sky" },
    { I: Award, t: "Young Researcher Award", d: "For the best abstract whose presenting author is a student or trainee.", c: "text-lnh-rose" },
  ];
  return (
    <>
      <PageHero eyebrow="Awards" title={<>Recognising <span className="text-grad-red">excellence</span></>} sub="Details, prize amounts and judging criteria will be announced. (Placeholder content — edit in code or ask your developer to move it to the CMS.)" />
      <div className="container-x grid gap-5 md:grid-cols-3">
        {awards.map(({ I, t, d, c }, i) => (
          <Reveal key={t} delay={i * 100} className="card card-hover p-8">
            <I className={`h-10 w-10 ${c}`} />
            <h2 className="h-display mt-8 text-2xl text-white">{t}</h2>
            <p className="mt-3 text-slate-400">{d}</p>
          </Reveal>
        ))}
      </div>
      <div className="container-x mt-12"><Link href="/abstracts" className="btn-primary">Submit an abstract</Link></div>
    </>
  );
}
