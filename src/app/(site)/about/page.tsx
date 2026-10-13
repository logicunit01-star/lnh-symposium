import Link from "next/link";
import { ArrowRight, Target, Users, Lightbulb, HeartPulse } from "lucide-react";
import { getEvent } from "@/lib/event";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "About the Symposium" };

export default async function About() {
  const ev = await getEvent();
  return (
    <>
      <PageHero eyebrow="About the symposium" title={<>{ev.theme.split(":")[0]}<span className="text-grad block">{ev.theme.split(":")[1] ?? ""}</span></>}
        sub={`The ${ev.name} brings together clinicians, nurses, administrators, economists, researchers and technologists at Liaquat National Hospital, Karachi — ${fmtDate(ev.startDate, { day: "numeric", month: "long" })} to ${fmtDate(ev.endDate)}.`} />
      <section className="container-x grid gap-12 lg:grid-cols-12">
        <Reveal className="prose-lnh lg:col-span-7">
          <h3>The theme</h3>
          <p>Every health system is trying to solve the same puzzle: deliver <b className="text-white">better quality</b> care, to <b className="text-white">more people</b>, at a <b className="text-white">sustainable cost</b> — while technology changes what is possible almost every month. Pull on one side of the puzzle and the others move. This is the healthcare conundrum.</p>
          <p>In Pakistan, where a large share of health spending is out-of-pocket, the stakes are especially high. Decisions about which test to order, which device to buy, or which digital system to adopt ripple out to patients and families.</p>
          <h3>Purpose</h3>
          <ul>
            <li>Examine the true drivers of healthcare cost and practical levers to control them.</li>
            <li>Share models of quality improvement and patient safety that work in our context.</li>
            <li>Separate evidence from hype in AI, telemedicine and digital health.</li>
            <li>Showcase local research through oral and poster presentations.</li>
            <li>Build skills through hands-on, small-group workshops.</li>
          </ul>
          <h3>Significance</h3>
          <p>The symposium is a platform for dialogue between those who deliver care, those who pay for it and those who build the tools for it — producing practical recommendations that participants can take back to their own institutions.</p>
          <div className="mt-8 flex flex-wrap gap-3 not-prose">
            <Link href="/register" className="btn-primary">Register Now <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/committee" className="btn-ghost">Organizing Committee</Link>
          </div>
        </Reveal>
        <div className="grid gap-4 self-start sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          {[
            { I: Target, t: "Who should attend", d: "Consultants, residents, GPs, nurses, allied health, administrators, students and health-tech professionals." },
            { I: Users, t: "Format", d: "Keynotes, plenaries, expert panels, oral & poster abstracts and hands-on workshops." },
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
