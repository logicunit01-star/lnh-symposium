import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/account";
import { getEvent, getFeeCategories, isEarlyBird } from "@/lib/event";
import { getProgramme, seatsTaken } from "@/lib/queries";
import { fmtDate } from "@/lib/utils";
import { CheckoutClient } from "./CheckoutClient";

export const metadata = { title: "Checkout", robots: { index: false } };

export default async function Checkout({ searchParams }: { searchParams: { welcome?: string } }) {
  const a = await currentAccount();
  if (!a) redirect("/account?next=/checkout");
  const [ev, cats, prog, taken] = await Promise.all([getEvent(), getFeeCategories(), getProgramme({ types: ["WORKSHOP"], registrable: true }), seatsTaken()]);
  const early = isEarlyBird(ev);
  const catalog = Object.fromEntries(prog.map((p) => [p.id, {
    title: p.title, kind: "WORKSHOP", fee: p.fee,
    left: p.capacity == null ? null : Math.max(0, p.capacity - (taken[p.id] ?? 0)),
    when: fmtDate(p.startsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" }), tag: p.department ?? p.track,
  }]));
  return (
    <section className="relative overflow-hidden pb-10 pt-40">
      <div className="circuit absolute inset-0 opacity-60" />
      <div className="container-x relative">
        <span className="eyebrow">Checkout</span>
        <h1 className="h-display mt-4 text-4xl text-white sm:text-5xl">Review and <span className="text-holo">pay</span></h1>
        <p className="mt-3 text-slate-300">Signed in as <b className="text-white">{a.title} {a.firstName} {a.lastName}</b> · {a.email} · {a.phone}</p>
        <CheckoutClient welcome={!!searchParams.welcome} contact={ev.contactEmail} catalog={catalog as any} categories={cats.filter((c) => c.designations?.length).map((c) => ({ id: c.id, label: c.label, fee: early ? c.earlyFee : c.fee, note: c.note, designations: c.designations }))}
          processingPct={ev.processingFeePct} early={early} banquet={{ fee: ev.banquetFee, max: ev.banquetMax }}
          account={{ gender: a.gender ?? "", institution: a.institution ?? "", specialty: a.specialty ?? "", whatsapp: a.whatsapp ?? "", cnic: a.cnic ?? "", address: a.address ?? "", city: a.city ?? "", province: a.province ?? "", country: a.country ?? "Pakistan", qualification: a.qualification ?? "", employeeNo: a.employeeNo ?? "", pmdcNo: a.pmdcNo ?? "" }} />
      </div>
    </section>
  );
}
