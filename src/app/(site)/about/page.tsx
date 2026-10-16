import Link from "next/link";
import { ArrowRight, Target, Users, Lightbulb, HeartPulse } from "lucide-react";
import { getEvent, eventDaysLabel } from "@/lib/event";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "About the Symposium" };

export default async function About() {
  const ev = await getEvent();
  return (
    <>
      <PageHero eyebrow="About the symposium" title={<>{ev.theme.split(":")[0]}<span className="text-grad block">{ev.theme.split(":")[1] ?? ""}</span></>}
        sub={`${ev.name}: ${ev.mainTheme}. Clinicians, nurses, administrators, engineers and researchers meet at Liaquat National Hospital, Karachi — ${eventDaysLabel(ev)}.`} />
      <section className="container-x grid gap-12 lg:grid-cols-12">
        <Reveal className="prose-lnh lg:col-span-7">
          <h3>The theme</h3>
          <p>Every health system is trying to solve the same puzzle: deliver <b className="text-white">better quality</b> care, to <b className="text-white">more people</b>, at a <b className="text-white">sustainable cost</b>. That is the healthcare conundrum. This edition asks how three technologies change the answer: <b className="text-white">artificial intelligence</b>, <b className="text-white">robotics</b> and <b className="text-white">digitization</b>.</p>
          <p>{ev.mainTheme}. In Pakistan, where much health spending is out-of-pocket, each choice about which algorithm, robot or digital system to adopt ripples out to patients and families.</p>
          <h3>Purpose</h3>
          <ul>
            <li>Separate evidence from hype in clinical AI, from imaging to early-warning systems.</li>
            <li>Examine robotic surgery and automation: outcomes, training and economics.</li>
            <li>Plan the digital hospital: records, telemedicine, interoperability and data governance.</li>
            <li>Keep cost and quality at the centre of every technology decision.</li>
            <li>Showcase local research through oral and poster presentations, and build skills in hands-on workshops.</li>
          </ul>
          <h3>Format</h3>
          <p>Pre-conference workshops run from December to January, followed by three symposium days ({eventDaysLabel(ev)}): Day 1 on artificial intelligence, Day 2 on robotics and Day 3 on digitization.</p>
          <div className="mt-8 flex flex-wrap gap-3 not-prose">
            <Link href="/register" className="btn-primary">Register Now <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/committee" className="btn-ghost">Organizing Committee</Link>
          </div>
        </Reveal>
        <div className="grid gap-4 self-start sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          {[
            { I: Target, t: "Who should attend", d: "Consultants, residents, GPs, nurses, allied health, administrators, students and health-tech professionals." },
            { I: Users, t: "Format", d: "Pre-conference workshops, keynotes, plenaries, expert panels and oral & poster abstracts." },
            { I: Lightbulb, t: "Outcomes", d: "Actionable frameworks for cost-conscious, quality-driven, technology-enabled care." },
            { I: HeartPulse, t: "Hosted by", d: "Liaquat National Hospital & Medical College — serving Karachi since 1958." },
          ].map(({ I, t, d }, i) => (
            <Reveal key={t} delay={i * 80} className="card card-hover p-6">
              <I className="h-6 w-6 text-lnh-rose" />
              <p className="mt-4 font-display text-lg font-semibold text-white">{t}</p>
              <p className="mt-1 text-sm text-slate-400">{d}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
