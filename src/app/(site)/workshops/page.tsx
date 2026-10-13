import Link from "next/link";
import { getProgramme, seatsTaken } from "@/lib/queries";
import { getEvent, isEarlyBird } from "@/lib/event";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { SessionCard } from "@/components/site/SessionCard";

export const metadata = { title: "Workshops" };

export default async function Workshops() {
  const [ev, prog, taken] = await Promise.all([getEvent(), getProgramme({ types: ["WORKSHOP"] }), seatsTaken()]);
  const early = isEarlyBird(ev);
  return (
    <>
      <PageHero eyebrow="Workshops" title={<>Learn by <span className="text-grad-red">doing</span></>}
        sub="Small-group, hands-on workshops with limited seats. Workshop fees are in addition to the conference registration fee. Seats are confirmed on payment.">
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="btn-primary">Register for Workshops</Link></div>
      </PageHero>
      <div className="container-x grid gap-5 md:grid-cols-2">
        {prog.map((w, i) => (
          <Reveal key={w.id} delay={(i % 2) * 100}><SessionCard s={w} taken={taken[w.id]} early={early} showDate cta={{ href: `/register?s=${w.id}`, label: "Register for this workshop" }} /></Reveal>
        ))}
      </div>
    </>
  );
}
