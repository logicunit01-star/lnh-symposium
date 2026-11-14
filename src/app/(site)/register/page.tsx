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
      <PageHero eyebrow="Registration" title={<>Register for the <span className="text-holo">event</span></>}
        sub={`Secure your place by selecting your preferred registration category and adding any pre-symposium workshops you wish to attend. Complete your registration and payment in one easy transaction.${earlyUntil ? ` Early-bird registration charges are applicable until ${earlyUntil}.` : ""}`}>
        <p className="mt-3 text-sm text-slate-300">* LNH employees can also register online</p>
      </PageHero>
      <div className="container-x grid gap-8 pb-28 lg:grid-cols-12 lg:pb-0">
        <div className="min-w-0 space-y-14 lg:col-span-8">
          {!ev.registrationOpen && <Alert>Registration is currently closed.</Alert>}
          <ProductCards fromFee={Math.min(...tiers.map((t) => t.fee))} early={early} />

          <section id="pass" className="scroll-mt-28">
            <p className="eyebrow">Step 1</p>
            <h2 className="h-display mt-2 text-3xl text-white">Symposium Registration</h2>
            <div className="mt-5"><PassStep tiers={tiers} early={early} earlyUntil={earlyUntil} banquet={{ fee: ev.banquetFee, max: ev.banquetMax }} open={ev.registrationOpen} /></div>
          </section>

          <section id="workshops" className="scroll-mt-28">
            <p className="eyebrow">Step 2 · optional</p>
            <h2 className="h-display mt-2 text-3xl text-white">Add Pre-Symposium Workshops</h2>
            <p className="mt-2 text-sm text-slate-300">Each workshop has a separate registration fee and limited seats. You can register for workshops with or without symposium registration.</p>
            {/* 14.11.2026: a button to the Workshops page instead of every workshop card here */}
            <Link href="/workshops" className="btn-primary mt-5">Explore Workshops</Link>
          </section>

          {/* guest and volunteer forms are no longer linked publicly (14.11.2026): invited people use the access link */}
        </div>
        <aside className="hidden lg:col-span-4 lg:block"><div className="lg:sticky lg:top-28"><CartPanel /></div></aside>
      </div>
      <OrderBar />
    </>
  );
}
