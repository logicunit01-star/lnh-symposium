import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { getProgramme } from "@/lib/queries";
import { loadRegistration } from "@/lib/registration";
import { fmtDate, fmtTime, SESSION_TYPE_LABEL } from "@/lib/utils";

export const metadata = { title: "Session feedback", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Feedback start page: the QR printed on the back of the registration ID card opens this list
 * (Dashboard Instructions, revised 06-11-2026: feedback QR moved from the dashboard to the ID card).
 * 17 Nov 2026 (participant feedback: "it showed all the workshops; I had to skim through and find the one I registered for"):
 * workshops are never listed for everyone. The ID card QR now carries the participant's own link (?t=), which shows only
 * their workshops; without it the participant finds their workshops by registration number and email.
 */
export default async function FeedbackIndex({ searchParams }: { searchParams: { t?: string } }) {
  const reg = searchParams.t ? await loadRegistration({ accessToken: searchParams.t }) : null;
  const confirmed = !!reg && (reg.paymentStatus === "PAID" || reg.paymentStatus === "WAIVED");
  const tq = reg ? `?t=${encodeURIComponent(reg.accessToken)}` : "";
  // scientific sessions, keynotes, panels: open to every symposium participant
  const prog = (await getProgramme()).filter((p) => p.type !== "BREAK" && p.type !== "WORKSHOP" && p.feedbackOpen);
  const days = [...new Set(prog.map((p) => fmtDate(p.startsAt, { weekday: "long", day: "numeric", month: "long" })))];
  // this participant's own workshops
  const mine = confirmed ? [...reg!.items].filter((i) => i.session.type === "WORKSHOP").sort((a, b) => +a.session.startsAt - +b.session.startsAt) : [];
  const done = new Set(mine.length ? (await db.select({ sid: s.feedback.sessionId }).from(s.feedback).where(and(eq(s.feedback.registrationId, reg!.id)))).map((x) => x.sid) : []);
  const now = new Date();
  const state = (i: (typeof mine)[number]) =>
    done.has(i.sessionId) ? ["Feedback given, thank you", null] as const
      : !i.session.feedbackOpen ? ["Feedback closed", null] as const
      : i.session.startsAt > now ? [`Opens when the workshop starts, ${fmtDate(i.session.startsAt, { day: "numeric", month: "short" })}`, null] as const
      : !i.attendedAt && !i.verifiedAt ? ["Opens once your attendance is recorded at the door", null] as const
      : ["Give feedback", `/feedback/${i.session.slug}${tq}`] as const;

  return (
    <section className="container-x max-w-3xl pb-10 pt-32">
      <p className="eyebrow">Your feedback</p>
      <h1 className="h-display mt-4 text-3xl text-white sm:text-4xl">{reg ? `${reg.title} ${reg.firstName}, rate what you attended` : "Rate the sessions you attended"}</h1>
      <p className="mt-3 text-slate-300">It takes under a minute for each.</p>

      {/* this participant's workshops only */}
      {reg && mine.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-white">Your workshops</h2>
          <ul className="mt-3 divide-y divide-white/10 rounded-2xl border border-lnh-gold/40">
            {mine.map((i) => { const [label, href] = state(i); return (
              <li key={i.id}>{href ? (
                <Link href={href} className="flex min-h-[56px] items-center justify-between gap-4 px-4 py-3 hover:bg-white/[0.04]">
                  <span><span className="block text-white">{i.session.title}</span><span className="text-xs text-slate-400">{fmtDate(i.session.startsAt, { weekday: "short", day: "numeric", month: "short" })} · {fmtTime(i.session.startsAt)}{i.session.hall ? ` · ${i.session.hall}` : ""}</span></span>
                  <span className="shrink-0 text-sm font-semibold text-lnh-sky">{label}</span></Link>
              ) : (
                <div className="flex min-h-[56px] items-center justify-between gap-4 px-4 py-3">
                  <span><span className="block text-white">{i.session.title}</span><span className="text-xs text-slate-400">{fmtDate(i.session.startsAt, { weekday: "short", day: "numeric", month: "short" })} · {fmtTime(i.session.startsAt)}</span></span>
                  <span className="shrink-0 text-right text-xs text-slate-400">{label}</span></div>
              )}</li>
            ); })}
          </ul>
        </div>
      )}
      {!reg && (
        <Link href="/feedback/workshops" className="hud mt-6 flex min-h-[56px] items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.04]">
          <span><span className="block font-semibold text-white">Your workshops</span><span className="text-sm text-slate-400">Enter your registration number and email to see the workshops you registered for</span></span>
          <span className="shrink-0 text-sm text-lnh-sky">Find my workshops</span></Link>
      )}

      {/* item 5 (16 Nov 2026): feedback on the symposium as a whole */}
      {(!reg || reg.hasPass) && (
        <Link href={`/feedback/symposium${tq}`} className="hud mt-6 flex min-h-[56px] items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.04]"><span><span className="block font-semibold text-white">The symposium as a whole</span><span className="text-sm text-slate-400">For participants who attended the symposium</span></span><span className="shrink-0 text-sm text-lnh-sky">Give feedback</span></Link>
      )}

      {(!reg || reg.hasPass) && days.map((d) => (
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
      {reg && !mine.length && !reg.hasPass && <p className="mt-8 text-slate-400">There is nothing to give feedback for on this registration yet.</p>}
      {(!reg || reg.hasPass) && !prog.length && <p className="mt-8 text-slate-400">Session feedback is not open yet.</p>}
    </section>
  );
}
