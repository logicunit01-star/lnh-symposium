import { getEvent, getFeeCategories, isEarlyBird } from "@/lib/event";
import { getProgramme, seatsTaken } from "@/lib/queries";
import { PageHero } from "@/components/ui/PageHero";
import { Alert } from "@/components/ui/Field";
import { fmtDate, fmtTime, pkr } from "@/lib/utils";
import { RegisterForm } from "./RegisterForm";

export const metadata = { title: "Registration" };

export default async function Register({ searchParams }: { searchParams: { s?: string } }) {
  const [ev, cats, prog, taken] = await Promise.all([getEvent(), getFeeCategories(), getProgramme({ registrable: true }), seatsTaken()]);
  const early = isEarlyBird(ev);
  const sessions = prog.map((p) => ({
    id: p.id, title: p.title, type: p.type, day: p.day, hall: p.hall,
    when: `${fmtDate(p.startsAt, { weekday: "short", day: "numeric", month: "short" })} · ${fmtTime(p.startsAt)}–${fmtTime(p.endsAt)}`,
    start: p.startsAt.toISOString(), end: p.endsAt.toISOString(),
    fee: early && p.earlyFee != null ? p.earlyFee : p.fee,
    left: p.capacity == null ? null : Math.max(0, p.capacity - (taken[p.id] ?? 0)),
  }));
  return (
    <>
      <PageHero eyebrow="Registration" title={<>Register for the <span className="text-grad">symposium</span></>}
        sub="Complete the form to receive your unique registration number instantly, with a PDF confirmation by email and SMS." />
      <div className="container-x grid gap-8 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-4 lg:order-2">
          <div className="card p-6">
            <p className="eyebrow">Conference fee</p>
            {early && <p className="mt-3 rounded-xl bg-lnh-red/15 px-3 py-2 text-xs font-semibold text-lnh-rose">Early-bird rates until {fmtDate(ev.earlyBirdUntil!)}</p>}
            <table className="mt-4 w-full text-sm">
              <thead><tr className="text-left text-[10px] uppercase tracking-widest text-slate-500"><th className="pb-2 font-medium">Category</th><th className="pb-2 text-right font-medium">Early</th><th className="pb-2 text-right font-medium">Regular</th></tr></thead>
              <tbody>{cats.map((c) => (
                <tr key={c.id} className="border-t border-white/10"><td className="py-2.5 pr-2 text-slate-300">{c.label}</td>
                  <td className={`py-2.5 text-right ${early ? "font-bold text-white" : "text-slate-500"}`}>{c.earlyFee.toLocaleString()}</td>
                  <td className={`py-2.5 text-right ${!early ? "font-bold text-white" : "text-slate-500"}`}>{c.fee.toLocaleString()}</td></tr>
              ))}</tbody>
            </table>
            <p className="mt-3 text-xs text-slate-500">All amounts in PKR. Workshop fees are additional.</p>
          </div>
          <div className="card p-6 text-sm text-slate-400">
            <p className="eyebrow mb-3">How it works</p>
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>Fill in your details and choose sessions/workshops.</li>
              <li>Get your registration number instantly.</li>
              <li>Pay online (card / wallet) or by bank transfer.</li>
              <li>Receive confirmation by email (PDF) &amp; SMS.</li>
            </ol>
            <a href="/register/status" className="mt-4 inline-block text-lnh-sky hover:underline">Already registered? Check status →</a>
          </div>
        </aside>
        <div className="lg:col-span-8 lg:order-1">
          {!ev.registrationOpen ? <Alert>Registration is currently closed.</Alert> :
            <RegisterForm categories={cats.map((c) => ({ id: c.id, label: c.label, fee: early ? c.earlyFee : c.fee, note: c.note }))} sessions={sessions} preselect={searchParams.s} />}
        </div>
      </div>
    </>
  );
}
