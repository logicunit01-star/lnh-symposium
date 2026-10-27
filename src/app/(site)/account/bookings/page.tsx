import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Download, LogOut, QrCode } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { currentAccount } from "@/lib/account";
import { PageHero } from "@/components/ui/PageHero";
import { fmtDate, fmtDateTime, pkr } from "@/lib/utils";

export const metadata = { title: "My bookings", robots: { index: false } };
const BADGE: Record<string, string> = { PAID: "bg-emerald-400/15 text-emerald-300", WAIVED: "bg-sky-400/15 text-sky-300", PENDING: "bg-amber-400/15 text-amber-300", FAILED: "bg-rose-400/15 text-rose-300", REFUNDED: "bg-white/10 text-slate-300" };

export default async function Bookings() {
  const a = await currentAccount();
  if (!a) redirect("/account?next=/account/bookings");
  const abstracts = await db.select().from(s.abstracts).where(eq(s.abstracts.accountId, a.id)).orderBy(desc(s.abstracts.createdAt));
  const regs = await db.query.registrations.findMany({ where: eq(s.registrations.accountId, a.id), orderBy: desc(s.registrations.createdAt), with: { items: { with: { session: true } }, category: true } });
  return (
    <>
      <PageHero eyebrow="My bookings" title={<>Welcome, <span className="text-holo">{a.title} {a.lastName}</span></>} sub={`${a.email} · ${a.institution}`}>
        <form action="/api/account/signout" method="POST" className="mt-6"><button className="btn-ghost btn-sm"><LogOut className="h-4 w-4" />Sign out</button></form>
      </PageHero>
      <div className="container-x space-y-4">
        {abstracts.length > 0 && (
          <div className="hud p-6">
            <p className="mono text-xs uppercase tracking-[0.2em] text-slate-400">My abstracts</p>
            <ul className="mt-3 divide-y divide-white/10">{abstracts.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span><span className="mono text-xs text-lnh-sky">{x.refNo}</span><span className="block text-white">{x.abstractTitle}</span></span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">{x.status === "ACCEPTED" && x.authorNotifiedAt ? `Accepted as ${x.acceptedAs === "POSTER" ? "poster" : "oral"}` : x.status === "REJECTED" && x.authorNotifiedAt ? "Not accepted" : "Under review"}</span>
              </li>
            ))}</ul>
          </div>
        )}
        {!regs.length && <div className="hud p-10 text-center text-slate-400">No bookings yet. <Link href="/workshops" className="text-lnh-sky underline">Browse workshops</Link> or <Link href="/register" className="text-lnh-sky underline">build your registration</Link>.</div>}
        {regs.map((r) => (
          <div key={r.id} className="hud p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mono text-xs uppercase tracking-[0.2em] text-slate-400">Registration ID</p>
                <p className="h-display mt-1 text-3xl text-white">{r.regNo}</p>
                <p className="mt-1 text-xs text-slate-500">Booked {fmtDateTime(r.createdAt)} · {r.category.label}{r.conferenceFee ? "" : " · workshops only"}</p>
              </div>
              <div className="text-right">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${BADGE[r.paymentStatus]}`}>{r.paymentStatus === "PENDING" ? "Payment pending" : r.paymentStatus}</span>
                <p className="mt-2 font-display text-2xl font-bold text-white">{pkr(r.totalFee)}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-sm text-slate-300">{r.items.map((i) => <li key={i.id}>• {i.session.title} <span className="text-slate-500">— {fmtDate(i.session.startsAt, { day: "numeric", month: "short", year: "numeric" })}</span></li>)}</ul>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/register/success/${r.accessToken}`} className={r.paymentStatus === "PENDING" ? "btn-primary btn-sm" : "btn-ghost btn-sm"}><QrCode className="h-4 w-4" />{r.paymentStatus === "PENDING" ? "Pay now / view pass" : "View QR pass"}</Link>
              <a href={`/api/registrations/${r.accessToken}/pdf`} className="btn-ghost btn-sm"><Download className="h-4 w-4" />PDF</a>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
