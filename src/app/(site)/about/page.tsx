import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getEvent } from "@/lib/event";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";

export const metadata = { title: "About the 9th LNH Symposium" };

export default async function About() {
  const ev = await getEvent();
  return (
    <>
      {/* 20 Nov 2026 ("sym changes web 2027"): new eyebrow; the paragraph under the heading replaced by the theme line;
          the four cards on the right removed */}
      <PageHero eyebrow="About the 9th LNH Symposium" title={<>{ev.theme.split(":")[0]}<span className="text-grad block">{ev.theme.split(":")[1] ?? ""}</span></>}>
        <p className="mt-6 max-w-3xl font-display text-2xl font-bold leading-snug text-white sm:text-3xl">Convergence of <span className="text-holo">AI, Robotics and Digitalization</span></p>
      </PageHero>
      <section className="container-x">
        <Reveal className="prose-lnh max-w-3xl">
          {/* "9th Liaquat National Hospital Symposium About us.docx" (LNH, 17 Nov 2026) */}
          <h3>9th Liaquat National Hospital Symposium</h3>
          <p>Healthcare is entering a new era, driven by advances in artificial intelligence (AI), robotics and digital technology. From supporting earlier disease detection and more accurate diagnoses to enabling precision surgery and improving patient care, these innovations are changing how healthcare is delivered.</p>
          <p>The 9th Liaquat National Hospital Symposium will explore how these technologies can work together to shape the future of healthcare. It will bring together healthcare professionals, researchers and experts to examine emerging innovations, their clinical applications and the opportunities they offer to improve patient outcomes while keeping compassionate, patient-centred care at the heart of medicine.</p>
          <p>The symposium programme will feature more than 100 pre-symposium workshops, a plenary session on the central theme, a debate session, webinars, and invited talks by national and international speakers. With more than 77 scientific sessions covering clinical specialties and healthcare administration, the event will provide a platform for knowledge exchange, professional development and meaningful discussion across the healthcare sector. There would be separate scientific sessions for the Allied health sciences and Nursing students as they are the integral part of the healthcare team.</p>
          <div className="mt-8 flex flex-wrap gap-3 not-prose">
            <Link href="/register" className="btn-primary">Register Now <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/committee" className="btn-ghost">Organizing Committee</Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
