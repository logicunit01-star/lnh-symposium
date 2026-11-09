import Link from "next/link";
import { getEvent, getFeeCategories, isEarlyBird } from "@/lib/event";
import { getProgramme, seatsTaken } from "@/lib/queries";
import { toWorkshopDTO } from "@/lib/workshops";
import { fmtDate } from "@/lib/utils";
import { PageHero } from "@/components/ui/PageHero";
import { Alert } from "@/components/ui/Field";
import { CartPanel } from "@/components/cart/CartPanel";
import { OrderBar } from "@/components/cart/CartDrawer";
import { WorkshopCatalog } from "../workshops/WorkshopCatalog";
import { PassStep, ProductCards, type Tier } from "./PassStep";

export const metadata = { title: "Registration" };

/** Registration redesign, release 1: two products (Symposium Pass, workshop tickets), one order summary, pay once. */
export default async function Register() {
  const [ev, cats, prog, taken] = await Promise.all([getEvent(), getFeeCategories(), getProgramme({ types: ["WORKSHOP"], registrable: true }), seatsTaken()]);
  const early = isEarlyBird(ev);
  const tiers: Tier[] = cats.filter((c) => c.designations?.length).map((c) => ({ id: c.id, code: c.code, designations: c.designations, fee: early ? c.earlyFee : c.fee, regular: c.fee }));
  const workshops = prog.map((w) => toWorkshopDTO(w, taken, early));
  const earlyUntil = early && ev.earlyBirdUntil ? fmtDate(ev.earlyBirdUntil) : null;
  return (
    <>
      <PageHero eyebrow="Registration" title={<>Register for the <span className="text-holo">symposium</span></>}
        sub={`Choose your Symposium Pass, add any hands-on workshops, then pay once.${earlyUntil ? ` Early-bird pass prices until ${earlyUntil}.` : ""} LNH staff register at the registration desk.`} />
      <div className="container-x grid gap-8 pb-28 lg:grid-cols-12 lg:pb-0">
        <div className="min-w-0 space-y-14 lg:col-span-8">
          {!ev.registrationOpen && <Alert>Registration is currently closed.</Alert>}
          <ProductCards fromFee={Math.min(...tiers.map((t) => t.fee))} early={early} />

          <section id="pass" className="scroll-mt-28">
            <p className="eyebrow">Step 1</p>
            <h2 className="h-display mt-2 text-3xl text-white">Your Symposium Pass</h2>
            <div className="mt-5"><PassStep tiers={tiers} early={early} earlyUntil={earlyUntil} banquet={{ fee: ev.banquetFee, max: ev.banquetMax }} open={ev.registrationOpen} /></div>
          </section>

          <section id="workshops" className="scroll-mt-28">
            <p className="eyebrow">Step 2 · optional</p>
            <h2 className="h-display mt-2 text-3xl text-white">Add workshop tickets</h2>
            <p className="mt-2 mb-5 text-sm text-slate-300">Each workshop is a separate ticket with its own fee and seats. You can buy workshops with or without a Symposium Pass, now or later.</p>
            <WorkshopCatalog items={workshops} embedded />
          </section>

          <p className="rounded-2xl border border-dashed border-white/25 px-5 py-4 text-sm text-slate-300">
            Invited guest or volunteer? Use the free <Link href="/register/guest" className="text-lnh-sky underline">guest</Link> or <Link href="/register/volunteer" className="text-lnh-sky underline">volunteer</Link> registration form.
          </p>
        </div>
        <aside className="hidden lg:col-span-4 lg:block"><div className="lg:sticky lg:top-28"><CartPanel /></div></aside>
      </div>
      <OrderBar />
    </>
  );
}
