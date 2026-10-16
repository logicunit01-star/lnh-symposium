import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";
import { getEvent, getFeeCategories, isEarlyBird, eventDays, DAY_THEMES } from "@/lib/event";
import { getProgramme, seatsTaken } from "@/lib/queries";
import { fmtDate } from "@/lib/utils";
import { PageHero } from "@/components/ui/PageHero";
import { Alert } from "@/components/ui/Field";
import { SessionCard } from "@/components/site/SessionCard";
import { CartPanel } from "@/components/cart/CartPanel";

export const metadata = { title: "Registration" };

export default async function Register() {
  const [ev, cats, prog, taken] = await Promise.all([getEvent(), getFeeCategories(), getProgramme({ registrable: true }), seatsTaken()]);
  const early = isEarlyBird(ev);
  const days = eventDays(ev);
  const sessions = prog.filter((p) => p.type !== "WORKSHOP");
  const workshops = prog.filter((p) => p.type === "WORKSHOP");
  return (
    <>
      <PageHero eyebrow="Registration" title={<>Build your <span className="text-holo">registration</span></>}
        sub="One account, one cart. Add the scientific sessions and workshops you want, choose your symposium pass at checkout, then pay once. LNH staff register onsite at the registration desk." />
      <div className="container-x grid gap-8 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-8">
          {!ev.registrationOpen && <Alert>Registration is currently closed.</Alert>}
          <section>
            <p className="eyebrow">Step 1 · Symposium pass fees</p>
            <div className="hud mt-4 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="mono text-left text-[10px] uppercase tracking-widest text-slate-500"><th className="px-5 py-3 font-medium">Category</th><th className="px-5 py-3 text-right font-medium">Early-bird</th><th className="px-5 py-3 text-right font-medium">Regular</th></tr></thead>
                <tbody>{cats.map((c) => (
                  <tr key={c.id} className="border-t border-white/10"><td className="px-5 py-3 text-slate-200">{c.label}</td>
                    <td className={`px-5 py-3 text-right ${early ? "font-bold text-white" : "text-slate-500"}`}>Rs {c.earlyFee.toLocaleString()}</td>
                    <td className={`px-5 py-3 text-right ${!early ? "font-bold text-white" : "text-slate-500"}`}>Rs {c.fee.toLocaleString()}</td></tr>
                ))}</tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">{early && ev.earlyBirdUntil ? `Early-bird rates apply until ${fmtDate(ev.earlyBirdUntil)}. ` : ""}Your pass covers keynotes, panels and ceremonies on all symposium days. You choose the category at checkout.</p>
          </section>

          <section>
            <p className="eyebrow">Step 2 · Scientific & plenary sessions (seat-limited)</p>
            {[1, 2, 3].map((d) => {
              const list = sessions.filter((s) => s.day === d);
              if (!list.length) return null;
              return (
                <div key={d} className="mt-6">
                  <p className="mono mb-3 text-xs uppercase tracking-[0.2em] text-lnh-sky">Day {d} · {DAY_THEMES[d]}{days[d - 1] ? ` · ${fmtDate(days[d - 1], { weekday: "short", day: "numeric", month: "short" })}` : ""}</p>
                  <div className="grid gap-4 md:grid-cols-2">{list.map((s) => <SessionCard key={s.id} s={s} taken={taken[s.id]} early={early} />)}</div>
                </div>
              );
            })}
          </section>

          <section>
            <p className="eyebrow">Step 3 · Pre-conference workshops</p>
            <div className="hud mt-4 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lnh-gold/15"><Wrench className="h-6 w-6 text-lnh-gold" /></span>
                <div><p className="font-display text-lg font-bold text-white">{workshops.length} approved workshops</p><p className="text-sm text-slate-400">Filter by week, date, department and format in the workshop portal.</p></div>
              </div>
              <Link href="/workshops" className="btn-blue shrink-0">Open workshop portal <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </section>
        </div>
        <aside className="lg:col-span-4"><div className="lg:sticky lg:top-28"><CartPanel /></div></aside>
      </div>
    </>
  );
}
