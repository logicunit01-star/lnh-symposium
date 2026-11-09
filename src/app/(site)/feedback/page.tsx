import Link from "next/link";
import { getProgramme } from "@/lib/queries";
import { fmtDate, fmtTime, SESSION_TYPE_LABEL } from "@/lib/utils";

export const metadata = { title: "Session feedback", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Feedback start page: the QR printed on the back of the registration ID card opens this list
 *  (Dashboard Instructions, revised 06-11-2026: feedback QR moved from the dashboard to the ID card). */
export default async function FeedbackIndex() {
  const prog = (await getProgramme()).filter((p) => p.type !== "BREAK" && p.feedbackOpen);
  const days = [...new Set(prog.map((p) => fmtDate(p.startsAt, { weekday: "long", day: "numeric", month: "long" })))];
  return (
    <section className="container-x max-w-3xl pb-10 pt-32">
      <p className="eyebrow">Your feedback</p>
      <h1 className="h-display mt-4 text-3xl text-white sm:text-4xl">Rate the sessions you attended</h1>
      <p className="mt-3 text-slate-300">Choose a session or workshop to give feedback. It takes under a minute.</p>
      {days.map((d) => (
        <div key={d} className="mt-8">
          <h2 className="font-display text-lg font-bold text-white">{d}</h2>
          <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-white/10">
            {prog.filter((p) => fmtDate(p.startsAt, { weekday: "long", day: "numeric", month: "long" }) === d).map((p) => (
              <li key={p.id}><Link href={`/feedback/${p.slug}`} className="flex min-h-[56px] items-center justify-between gap-4 px-4 py-3 hover:bg-white/[0.04]">
                <span><span className="block text-white">{p.title}</span><span className="text-xs text-slate-400">{SESSION_TYPE_LABEL[p.type]} · {fmtTime(p.startsAt)}{p.hall ? ` · ${p.hall}` : ""}</span></span>
                <span className="shrink-0 text-sm text-lnh-sky">Give feedback</span></Link></li>
            ))}
          </ul>
        </div>
      ))}
      {!prog.length && <p className="mt-8 text-slate-400">Feedback is not open yet.</p>}
    </section>
  );
}
