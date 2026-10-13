import Link from "next/link";
import { getProgramme, seatsTaken } from "@/lib/queries";
import { getEvent, isEarlyBird } from "@/lib/event";
import { PageHero } from "@/components/ui/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { SessionCard } from "@/components/site/SessionCard";

export const metadata = { title: "Scientific & Plenary Sessions" };

export default async function Sessions() {
  const [ev, prog, taken] = await Promise.all([getEvent(), getProgramme({ types: ["PLENARY", "SCIENTIFIC", "KEYNOTE", "PANEL"] }), seatsTaken()]);
  const early = isEarlyBird(ev);
  const groups = [
    { t: "Plenary sessions", d: "Evidence and debate on the symposium's three themes.", items: prog.filter((p) => p.type === "PLENARY") },
    { t: "Scientific sessions", d: "Peer-reviewed oral abstract presentations judged for the symposium awards.", items: prog.filter((p) => p.type === "SCIENTIFIC") },
    { t: "Keynotes & panels", d: "Included with conference registration — no separate sign-up needed.", items: prog.filter((p) => p.type === "KEYNOTE" || p.type === "PANEL") },
  ];
  return (
    <>
      <PageHero eyebrow="Scientific & plenary" title={<>Science on <span className="text-grad">stage</span></>}
        sub="Plenary and scientific sessions have seat caps per hall. Select the sessions you plan to attend when you register so we can allot seats.">
        <div className="mt-8"><Link href="/register" className="btn-primary">Register for Scientific & Plenary</Link></div>
      </PageHero>
      <div className="container-x space-y-20">
        {groups.map((g) => (
          <section key={g.t}>
            <Reveal className="mb-8"><h2 className="h-display text-3xl text-white sm:text-4xl">{g.t}</h2><p className="mt-2 text-slate-400">{g.d}</p></Reveal>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {g.items.map((s, i) => <Reveal key={s.id} delay={(i % 3) * 80}><SessionCard s={s} taken={taken[s.id]} early={early} showDate cta={s.registrable ? { href: `/register?s=${s.id}`, label: "Register" } : undefined} /></Reveal>)}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
