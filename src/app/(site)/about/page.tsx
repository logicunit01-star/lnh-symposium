import Link from "next/link";
import { ArrowRight, Target, Users, Lightbulb, HeartPulse } from "lucide-react";
import { getEvent, eventDaysLabel } from "@/lib/event";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";

export const metadata = { title: "About the Symposium" };

export default async function About() {
  const ev = await getEvent();
  return (
    <>
      <PageHero eyebrow="About the symposium" title={<>{ev.theme.split(":")[0]}<span className="text-grad block">{ev.theme.split(":")[1] ?? ""}</span></>}
        sub={`${ev.name}: ${ev.mainTheme}. Clinicians, nurses, administrators, engineers and researchers meet at Liaquat National Hospital, Karachi — ${eventDaysLabel(ev)}.`} />
      <section className="container-x grid gap-12 lg:grid-cols-12">
        <Reveal className="prose-lnh lg:col-span-7">
          {/* "9th Liaquat National Hospital Symposium About us.docx" (LNH, 17 Nov 2026) */}
          <h3>9th Liaquat National Hospital Symposium</h3>
          <p><b className="text-white">Shaping the New Era of Healthcare: Convergence of AI, Robotics and Digitalization</b></p>
          <p>Healthcare is entering a new era, driven by advances in artificial intelligence (AI), robotics and digital technology. From supporting earlier disease detection and more accurate diagnoses to enabling precision surgery and improving patient care, these innovations are changing how healthcare is delivered.</p>
          <p>The 9th Liaquat National Hospital Symposium will explore how these technologies can work together to shape the future of healthcare. It will bring together healthcare professionals, researchers and experts to examine emerging innovations, their clinical applications and the opportunities they offer to improve patient outcomes while keeping compassionate, patient-centred care at the heart of medicine.</p>
          <p>The symposium programme will feature more than 100 pre-symposium workshops, a plenary session on the central theme, a debate session, webinars, and invited talks by national and international speakers. With more than 77 scientific sessions covering clinical specialties and healthcare administration, the event will provide a platform for knowledge exchange, professional development and meaningful discussion across the healthcare sector. There would be separate scientific sessions for the Allied health sciences and Nursing students as they are the integral part of the healthcare team.</p>
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
            { I: HeartPulse, t: "Hosted by", d: "Liaquat National Hospital, Institute for Undergraduate and Postgraduate Medical Studies and Health Sciences, Karachi." },
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
