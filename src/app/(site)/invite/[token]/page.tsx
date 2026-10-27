import { notFound, redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, MapPin, XCircle } from "lucide-react";
import { PageHero } from "@/components/ui/PageHero";
import { findByToken, setStatus } from "@/lib/invitations";
import { rateLimit } from "@/lib/ratelimit";

export const metadata = { title: "Your invitation", robots: { index: false } };
export const dynamic = "force-dynamic";

async function respond(token: string, f: FormData) {
  "use server";
  if (!rateLimit(`inv:${token}`, 10)) redirect(`/invite/${token}?err=1`);
  const i = await findByToken(token);
  if (!i || i.status === "WITHDRAWN") redirect(`/invite/${token}`);
  const answer = f.get("answer") === "accept" ? "ACCEPTED" : "DECLINED";
  await setStatus(i, { inviteStatus: answer, respondedAt: new Date(), responseNote: String(f.get("note") || "").slice(0, 500) || null });
  redirect(`/invite/${token}?done=${answer}`);
}

export default async function InvitePage({ params, searchParams }: { params: { token: string }; searchParams: { done?: string } }) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(params.token)) notFound();
  const i = await findByToken(params.token);
  if (!i) notFound();
  const answered = i.status === "ACCEPTED" || i.status === "DECLINED";
  return (
    <>
      <PageHero eyebrow="Invitation" title={<>{i.role}</>} sub={`Dear ${i.name}, the Scientific Committee invites you to take part in the 9th LNH Symposium 2027.`} />
      <div className="container-x max-w-2xl">
        <div className="hud space-y-4 p-6 sm:p-8">
          {i.session && <p className="font-display text-2xl font-bold text-white">{i.session}</p>}
          {i.topic && <p className="text-slate-300">“{i.topic}”</p>}
          <ul className="mono space-y-2 text-sm text-slate-300">
            {i.when && <li className="flex gap-2"><CalendarClock className="h-4 w-4 text-lnh-sky" />{i.when}</li>}
            {i.venue && <li className="flex gap-2"><MapPin className="h-4 w-4 text-lnh-sky" />{i.venue}, Liaquat National Hospital</li>}
          </ul>
          {i.status === "WITHDRAWN" ? <p className="rounded-xl bg-white/5 p-4 text-sm text-slate-300">This invitation has been withdrawn by the secretariat.</p>
            : answered || searchParams.done ? (
              <p className="flex items-center gap-2 rounded-xl bg-white/5 p-4 text-sm text-white">{(searchParams.done ?? i.status) === "ACCEPTED" ? <><CheckCircle2 className="h-5 w-5 text-emerald-400" />Thank you, you have accepted. The secretariat will be in touch with details.</> : <><XCircle className="h-5 w-5 text-lnh-rose" />You have declined. Thank you for letting us know.</>}</p>
            ) : (
              <form action={respond.bind(null, params.token)} className="space-y-3 pt-2">
                <textarea name="note" rows={2} placeholder="Message to the secretariat (optional)" className="input" />
                <div className="flex flex-wrap gap-3">
                  <button name="answer" value="accept" className="btn-primary"><CheckCircle2 className="h-4 w-4" />Accept invitation</button>
                  <button name="answer" value="decline" className="btn-ghost"><XCircle className="h-4 w-4" />Decline</button>
                </div>
              </form>
            )}
        </div>
      </div>
    </>
  );
}
