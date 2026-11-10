import { getEvent, isEarlyBird } from "@/lib/event";
import { getProgramme, seatsTaken } from "@/lib/queries";
import { toWorkshopDTO } from "@/lib/workshops";
import { NeuralField } from "@/components/ui/NeuralField";
import { WorkshopCatalog } from "./WorkshopCatalog";

export const metadata = { title: "Pre-Symposium Workshops" };

export default async function Workshops() {
  const [ev, prog, taken] = await Promise.all([getEvent(), getProgramme({ types: ["WORKSHOP"] }), seatsTaken()]);
  const early = isEarlyBird(ev);
  const items = prog.map((w) => toWorkshopDTO(w, taken, early));
  return (
    <>
      <section className="noise relative overflow-hidden pb-10 pt-36">
        <div className="circuit absolute inset-0 opacity-80 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
        <NeuralField density={0.6} />
        <div className="orb -left-20 -top-20 h-[420px] w-[420px] bg-lnh-blue/30" />
        <div className="orb right-0 top-10 h-[320px] w-[320px] bg-lnh-red/20 [animation-delay:-5s]" />
        <div className="container-x relative">
          <span className="eyebrow">Pre-conference workshops</span>
          <h1 className="h-display mt-5 max-w-5xl text-[2.5rem] text-white sm:text-6xl lg:text-7xl">Pre-symposium <span className="text-holo">workshops</span></h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">Approved multi-disciplinary skills training before the symposium. Each workshop is a separate ticket: no Symposium Pass needed, and the pass does not include workshops.</p>
        </div>
      </section>
      <WorkshopCatalog items={items} />
    </>
  );
}
