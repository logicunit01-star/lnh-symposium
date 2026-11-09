import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, or, and, isNull, sql } from "drizzle-orm";
import { Award, CalendarDays, Download, LogOut, MapPin, QrCode, Ticket, Utensils, Wrench } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { currentAccount } from "@/lib/account";
import { banquetTotal } from "@/lib/registration";
import { getEvent } from "@/lib/event";
import { PageHero } from "@/components/ui/PageHero";
import { cn, fmtDate, fmtDateTime, fmtTime, pkr } from "@/lib/utils";
import { authorStatus } from "@/lib/abstracts";

export const metadata = { title: "My tickets", robots: { index: false } };
const LIVE = ["PENDING", "PAID", "WAIVED"];
const STATUS: Record<string, [string, string]> = {
  CONFIRMED: ["Confirmed", "bg-emerald-400/15 text-emerald-300"], PENDING: ["Payment pending", "bg-amber-400/15 text-amber-300"],
  AWAITING: ["Awaiting approval", "bg-sky-400/15 text-sky-300"], REJECTED: ["Not approved", "bg-rose-400/15 text-rose-300"],
  FAILED: ["Payment failed", "bg-rose-400/15 text-rose-300"], REFUNDED: ["Refunded", "bg-white/10 text-slate-300"],
};
type Reg = Awaited<ReturnType<typeof load>>[number];
const statusOf = (r: Reg) => r.regType !== "PARTICIPANT" && r.approvalStatus !== "APPROVED" ? (r.approvalStatus === "REJECTED" ? "REJECTED" : "AWAITING")
  : r.paymentStatus === "PAID" || r.paymentStatus === "WAIVED" ? "CONFIRMED" : r.paymentStatus;
const Chip = ({ k }: { k: string }) => <span className={cn("rounded-full px-3 py-1 text-xs font-bold", STATUS[k]?.[1])}>{STATUS[k]?.[0] ?? k}</span>;

// The account's own orders plus registrations made with the same email without an account (desk, guest, volunteer)
const load = (a: { id: string; email: string }) => db.query.registrations.findMany({
  where: or(eq(s.registrations.accountId, a.id), and(isNull(s.registrations.accountId), sql`lower(${s.registrations.email}) = ${a.email.toLowerCase()}`)),
  orderBy: desc(s.registrations.createdAt), with: { items: { with: { session: true } }, category: true },
});

/** My tickets (registration redesign, release 2): the Symposium Pass, each workshop ticket, then orders and abstracts. */
export default async function MyTickets() {
  const a = await currentAccount();
  if (!a) redirect("/account?next=/account/bookings");
  const [ev, abstracts, regs] = await Promise.all([getEvent(), db.select().from(s.abstracts).where(eq(s.abstracts.accountId, a.id)).orderBy(desc(s.abstracts.createdAt)), load(a)]);
  const live = regs.filter((r) => LIVE.includes(r.paymentStatus));
  const pass = live.find((r) => r.hasPass) ?? null;
  const tickets = live.flatMap((r) => r.items.map((i) => ({ ...i, order: r }))).sort((x, y) => +x.session.startsAt - +y.session.startsAt);
  const pk = pass ? statusOf(pass) : null;
  return (
    <>
      <PageHero eyebrow="My tickets" title={<>Welcome, <span className="text-holo">{a.title} {a.lastName}</span></>} sub={a.email}>
        <form action="/api/account/signout" method="POST" className="mt-6"><button className="btn-ghost btn-sm"><LogOut className="h-4 w-4" />Sign out</button></form>
      </PageHero>
      <div className="container-x max-w-5xl space-y-10">
        {/* Symposium Pass */}
        <section aria-labelledby="h-pass">
          <h2 id="h-pass" className="h-display text-2xl text-white">Symposium Pass</h2>
          {pass ? (
            <div className="mt-4 rounded-3xl border-2 border-lnh-sky/50 bg-lnh-sky/[0.07] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-4">
                  <Ticket className="mt-1 h-7 w-7 shrink-0 text-lnh-sky" />
                  <div>
                    <p className="mono text-sm text-lnh-sky">{pass.regNo}</p>
                    <p className="font-display text-xl font-bold text-white">{pass.regType === "PARTICIPANT" ? `${pass.designation ?? ""} · ${pass.category.label.split(",")[0]}` : pass.category.label}</p>
                    <p className="mt-1 text-sm text-slate-200">All sessions · {fmtDate(ev.startDate, { day: "numeric", month: "short" })} – {fmtDate(ev.endDate, { day: "numeric", month: "short", year: "numeric" })} · {ev.venue}</p>
                    {pass.regType === "PARTICIPANT" && <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-200"><Utensils className="h-4 w-4" />Banquet passes: {banquetTotal(pass)}{pass.banquetQty ? ` (1 included + ${pass.banquetQty} extra)` : " (included)"}</p>}
                  </div>
                </div>
                <Chip k={pk!} />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/register/success/${pass.accessToken}`} className={pk === "PENDING" ? "btn-primary btn-sm" : "btn-ghost btn-sm"}><QrCode className="h-4 w-4" />{pk === "PENDING" ? `Pay ${pkr(pass.totalFee)}` : "Show pass and QR"}</Link>
                <a href={`/api/registrations/${pass.accessToken}/pdf`} className="btn-ghost btn-sm"><Download className="h-4 w-4" />PDF and ID card</a>
                {pass.certificateNo && <a href={`/api/certificates/${pass.accessToken}`} className="btn-ghost btn-sm"><Award className="h-4 w-4" />E-certificate</a>}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-dashed border-white/25 p-6">
              <p className="text-slate-200">No Symposium Pass yet. One pass admits you to every session on all three days, with a banquet pass included.</p>
              <Link href="/register#pass" className="btn-primary btn-sm">Get your pass</Link>
            </div>
          )}
        </section>

        {/* Workshop tickets */}
        <section aria-labelledby="h-ws">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="h-ws" className="h-display text-2xl text-white">Workshop tickets</h2>
            <Link href="/register#workshops" className="text-sm text-lnh-sky underline">Add a workshop</Link>
          </div>
          {tickets.length ? (
            <ul className="mt-4 space-y-3">
              {tickets.map((t) => (
                <li key={t.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-lnh-gold/30 bg-lnh-gold/[0.05] p-5">
                  <div className="flex gap-4">
                    <Wrench className="mt-1 h-6 w-6 shrink-0 text-lnh-gold" />
                    <div>
                      <p className="font-display text-lg font-bold text-white">{t.session.title}</p>
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-200">
                        <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{fmtDate(t.session.startsAt, { weekday: "short", day: "numeric", month: "short" })} · {fmtTime(t.session.startsAt)} – {fmtTime(t.session.endsAt)}</span>
                        {t.session.hall && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{t.session.hall}</span>}
                      </p>
                      <p className="mono mt-1 text-xs text-slate-300">Order {t.order.regNo}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Chip k={statusOf(t.order)} />
                    <Link href={`/register/success/${t.order.accessToken}`} className="text-sm text-lnh-sky underline">{statusOf(t.order) === "PENDING" ? "Pay now" : "View ticket"}</Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-white/25 p-6 text-slate-200">No workshop tickets. Workshops are separate tickets, bought with or without a pass. <Link href="/register#workshops" className="text-lnh-sky underline">Browse workshops</Link></p>
          )}
        </section>

        {/* Abstracts */}
        {abstracts.length > 0 && (
          <section aria-labelledby="h-abs">
            <h2 id="h-abs" className="h-display text-2xl text-white">My abstracts</h2>
            <ul className="hud mt-4 divide-y divide-white/10 px-6">{abstracts.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-4">
                <span><span className="mono text-xs text-lnh-sky">{x.refNo}</span><span className="block text-white">{x.abstractTitle}</span></span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">{authorStatus(x).label}{x.status === "ACCEPTED" && x.authorNotifiedAt ? ` (${x.acceptedAs === "POSTER" ? "poster" : "oral"})` : ""}</span>
              </li>
            ))}</ul>
          </section>
        )}

        {/* Orders (finance trail) */}
        {regs.length > 0 && (
          <details className="hud p-6">
            <summary className="cursor-pointer font-display text-lg font-bold text-white">Orders and payments ({regs.length})</summary>
            <ul className="mt-4 divide-y divide-white/10">{regs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span><span className="mono text-lnh-sky">{r.regNo}</span><span className="block text-slate-300">{fmtDateTime(r.createdAt)} · {[r.hasPass ? "Symposium Pass" : null, r.items.length ? `${r.items.length} workshop${r.items.length === 1 ? "" : "s"}` : null].filter(Boolean).join(" + ")}</span></span>
                <span className="flex items-center gap-3"><b className="text-white">{pkr(r.totalFee)}</b><Chip k={statusOf(r)} /><a href={`/api/registrations/${r.accessToken}/pdf`} className="text-lnh-sky underline">PDF</a></span>
              </li>
            ))}</ul>
          </details>
        )}
      </div>
    </>
  );
}
