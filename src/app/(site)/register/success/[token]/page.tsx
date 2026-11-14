import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, CalendarPlus, CheckCircle2, Clock, Download, MapPin, Plus, Ticket, Utensils, Wrench } from "lucide-react";
import QRCode from "qrcode";
import { loadRegistration, banquetTotal, WORKSHOP_EMAIL } from "@/lib/registration";
import { getEvent } from "@/lib/event";
import { provider, BANK_DETAILS } from "@/lib/payments";
import { appUrl, cn, fmtDate, fmtTime, pkr } from "@/lib/utils";
import { Alert } from "@/components/ui/Field";
import { PayButton } from "./PayButton";
import { qrPayload, ticketPayload } from "@/lib/qr-payload";
import { workshopCertUrl } from "@/lib/certificates";

export const metadata = { title: "Your tickets", robots: { index: false } };
const qrOpts = { margin: 1, width: 260, color: { dark: "#040B1E", light: "#ffffff" } };

/** E-ticket page (registration redesign, release 3): a Symposium Pass card and one card per workshop ticket, each with its own QR (D4). */
export default async function Success({ params, searchParams }: { params: { token: string }; searchParams: { paid?: string; failed?: string; pending?: string } }) {
  const r = await loadRegistration({ accessToken: params.token });
  if (!r) notFound();
  const ev = await getEvent();
  const awaiting = r.regType !== "PARTICIPANT" && r.approvalStatus !== "APPROVED";
  const rejected = r.approvalStatus === "REJECTED";
  const paid = r.paymentStatus === "PAID" || r.paymentStatus === "WAIVED";
  const confirmed = paid && !awaiting;
  const items = [...r.items].sort((a, b) => +a.session.startsAt - +b.session.startsAt);
  const passQr = r.hasPass && !awaiting ? await QRCode.toDataURL(qrPayload(r), qrOpts) : null;
  const ticketQrs = awaiting ? [] : await Promise.all(items.map((i) => QRCode.toDataURL(ticketPayload(r, i), qrOpts)));
  // SC feedback: separate QR codes for the Scientific Agenda and the e-abstract book
  const [qrAgenda, qrBook] = await Promise.all([`${appUrl()}/agenda`, `${appUrl()}/abstracts/book`].map((u) => QRCode.toDataURL(u, { margin: 1, width: 200, color: { dark: "#232667", light: "#ffffff" } })));
  const prov = provider();
  const status = confirmed ? ["Confirmed", "bg-emerald-400/15 text-emerald-300"] : rejected ? ["Not approved", "bg-rose-400/15 text-rose-300"] : awaiting ? ["Awaiting approval", "bg-sky-400/15 text-sky-300"] : ["Payment pending", "bg-amber-400/15 text-amber-300"];
  const ics = `/api/registrations/${r.accessToken}/ics`;
  return (
    <section className="relative overflow-hidden pb-10 pt-36">
      <div className="orb -left-20 top-0 h-96 w-96 bg-lnh-blue/30" />
      <div className="orb right-0 top-40 h-80 w-80 bg-lnh-red/20" />
      <div className="container-x relative max-w-4xl space-y-6">
        {searchParams.failed && <Alert>Payment was not completed. You can try again below.</Alert>}
        {searchParams.pending && !confirmed && <Alert>We have not received the payment confirmation from PayPro yet. If you paid by bank app, ATM or over the counter, your registration is confirmed automatically once PayPro tells us, and you will receive an email.</Alert>}

        {/* header */}
        <div className={cn("flex flex-wrap items-center justify-between gap-4 rounded-3xl px-6 py-5 sm:px-8", confirmed ? "bg-emerald-500/15" : rejected ? "bg-rose-500/15" : "bg-amber-500/15")}>
          <div className="flex items-center gap-3">
            {confirmed ? <CheckCircle2 className="h-7 w-7 text-emerald-300" /> : <Clock className="h-7 w-7 text-amber-300" />}
            <div>
              <p className="font-display text-2xl font-bold text-white">{confirmed ? "You're registered" : rejected ? "Registration not approved" : awaiting ? "Registration received" : "Almost there: payment pending"}</p>
              <p className="text-sm text-slate-200">{r.title} {r.firstName} {r.lastName} · <span className="mono">{r.regNo}</span>{r.regType === "PARTICIPANT" && r.designation ? ` · ${r.designation}` : ""}</p>
              {awaiting && <p className="text-sm text-slate-200">Awaiting approval by {r.regType === "GUEST" ? `the HOD, ${r.department}` : "the Chairperson, Facilitation Committee"}. Your pass and QR appear here once approved.</p>}
            </div>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", status[1])}>{status[0]}</span>
        </div>

        {/* pay first when pending */}
        {!confirmed && !awaiting && !rejected && (
          <div className="hud flex flex-wrap items-center justify-between gap-4 p-6">
            <div><p className="font-semibold text-white">Pay {pkr(r.totalFee)} to confirm your tickets</p><p className="text-sm text-slate-300">Your QR codes work at entry once payment is received.</p></div>
            {prov !== "manual" && <PayButton token={r.accessToken} amount={pkr(r.totalFee)} />}
            {prov === "paypro" && <p className="w-full text-xs text-slate-400">Secure payment through PayPro: debit/credit card, bank app, ATM or over the counter.</p>}
          </div>
        )}

        {/* Symposium Pass */}
        {r.hasPass && (
          <article className="grid gap-6 rounded-3xl border-2 border-lnh-sky/50 bg-lnh-sky/[0.07] p-6 sm:grid-cols-[1fr_auto] sm:p-8">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-lnh-sky"><Ticket className="h-4 w-4" />Symposium Pass</p>
              <p className="mt-2 font-display text-2xl font-bold text-white">{fmtDate(ev.startDate, { day: "numeric", month: "short" })} – {fmtDate(ev.endDate, { day: "numeric", month: "short", year: "numeric" })}</p>
              <p className="mt-1 text-slate-200">Admits to all scientific, plenary and keynote sessions, panels and ceremonies · {ev.venue}</p>
              {r.regType === "PARTICIPANT" && <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-200"><Utensils className="h-4 w-4" />Banquet passes: {banquetTotal(r)}{r.banquetQty ? ` (1 included + ${r.banquetQty} extra)` : " (included)"}</p>}
              <p className="mono mt-3 text-sm text-slate-300">Pass {r.regNo}</p>
            </div>
            {passQr && <div className="text-center"><img src={passQr} alt={`Symposium Pass QR code ${r.regNo}`} className="mx-auto h-40 w-40 rounded-2xl bg-white p-2" /><p className="mt-2 text-xs text-slate-300">Show at the symposium entrance</p></div>}
          </article>
        )}

        {/* Workshop tickets */}
        {items.map((i, n) => (
          <article key={i.id} className="grid gap-6 rounded-3xl border-2 border-lnh-gold/50 bg-lnh-gold/[0.06] p-6 sm:grid-cols-[1fr_auto] sm:p-8">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-lnh-gold"><Wrench className="h-4 w-4" />Workshop ticket</p>
              <p className="mt-2 font-display text-xl font-bold text-white">{i.session.title}</p>
              <p className="mt-1 text-slate-200">{i.session.days > 1 ? `${fmtDate(i.session.startsAt, { weekday: "short", day: "numeric", month: "short" })} to ${fmtDate(i.session.endsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · daily` : fmtDate(i.session.startsAt, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {fmtTime(i.session.startsAt)} – {fmtTime(i.session.endsAt)}</p>
              {confirmed && i.session.mode !== "ONSITE" && i.session.onlineLink && <p className="mt-1 text-slate-200">Online: <a href={i.session.onlineLink} className="break-all text-lnh-sky underline" target="_blank" rel="noreferrer">{i.session.onlineLink}</a></p>}
              {i.session.mode !== "ONLINE" && i.session.hall && <p className="mt-1 flex items-center gap-1.5 text-slate-200"><MapPin className="h-4 w-4" />{i.session.venueId ? <a href={`/venues#${i.session.venueId}`} className="underline">{i.session.hall}</a> : i.session.hall}</p>}
              <p className="mono mt-3 text-sm text-slate-300">Ticket {i.ticketNo ?? r.regNo}</p>
              <div className="flex flex-wrap gap-x-5">
                <a href={`${ics}?item=${i.id}`} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-lnh-sky underline"><CalendarPlus className="h-4 w-4" />Add to calendar</a>
                {/* N6 / N7: feedback after the workshop starts; certificate once attendance is confirmed and feedback is in */}
                {confirmed && i.certNo && <a href={workshopCertUrl(i.id, r.accessToken)} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-lnh-gold underline"><Award className="h-4 w-4" />Workshop certificate</a>}
                {confirmed && !i.certNo && i.session.startsAt <= new Date() && <a href={`/feedback/${i.session.slug}?t=${encodeURIComponent(r.accessToken)}`} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm text-lnh-sky underline">Give feedback{i.verifiedAt ? " to get your certificate" : ""}</a>}
              </div>
            </div>
            {ticketQrs[n] && <div className="text-center"><img src={ticketQrs[n]} alt={`Workshop ticket QR code ${i.ticketNo ?? ""}`} className="mx-auto h-40 w-40 rounded-2xl bg-white p-2" /><p className="mt-2 text-xs text-slate-300">Show at the workshop door</p></div>}
          </article>
        ))}

        {/* next actions */}
        <div className="flex flex-wrap gap-3">
          <a href={ics} className="btn-ghost"><CalendarPlus className="h-4 w-4" />Add all to calendar</a>
          <a href={`/api/registrations/${r.accessToken}/pdf`} className="btn-ghost"><Download className="h-4 w-4" />PDF e-ticket and ID card</a>
          {r.certificateNo && <a href={`/api/certificates/${r.accessToken}`} className="btn-blue"><Award className="h-4 w-4" />E-certificate</a>}
          <Link href="/register#workshops" className="btn-ghost"><Plus className="h-4 w-4" />Add workshops</Link>
        </div>

        {confirmed && r.hasPass && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[[qrAgenda, "Scientific Agenda", "/agenda"], [qrBook, "e-Abstract book", "/abstracts/book"]].map(([src, label, href]) => (
              <a key={href} href={href} className="flex items-center gap-4 rounded-2xl border border-white/10 p-4 hover:border-white/30">
                <img src={src} alt={`QR code: ${label}`} className="h-24 w-24 rounded-xl bg-white p-1.5" />
                <span><span className="block font-semibold text-white">{label}</span><span className="text-xs text-slate-300">Scan or tap to open. Also printed on your ID card.</span></span>
              </a>
            ))}
          </div>
        )}

        {/* payment summary */}
        <details className="hud p-6" open={!confirmed}>
          <summary className="cursor-pointer font-display text-lg font-bold text-white">Payment summary · {pkr(r.totalFee)}</summary>
          <div className="mt-4">
            {r.hasPass && <div className="flex justify-between py-1.5 text-sm"><span className="text-slate-300">{r.regType === "PARTICIPANT" ? `Symposium Pass${r.earlyBird ? " (early-bird)" : ""}, includes 1 banquet pass` : `${r.category.label} (complimentary)`}</span><span className="text-white">{pkr(r.conferenceFee)}</span></div>}
            {r.banquetQty > 0 && <div className="flex justify-between py-1.5 text-sm"><span className="text-slate-300">Extra banquet pass × {r.banquetQty}</span><span className="text-white">{pkr(r.banquetFee)}</span></div>}
            {items.map((i) => <div key={i.id} className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-slate-300">Workshop ticket: {i.session.title}</span><span className="shrink-0 text-white">{pkr(i.fee)}</span></div>)}
            <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-4"><span className="font-semibold uppercase tracking-wider text-white">Total</span><span className="font-display text-3xl font-bold text-lnh-rose">{pkr(r.totalFee)}</span></div>
            {!confirmed && !awaiting && !rejected && (
              <div className="mt-4 text-sm text-slate-300">
                <p className="mb-2 font-semibold text-white">{prov === "manual" ? "Payment by bank transfer" : "Prefer bank transfer?"}</p>
                <ul className="space-y-1">{BANK_DETAILS.map((b) => <li key={b}>{b}</li>)}</ul>
              </div>
            )}
          </div>
        </details>
        <p className="text-center text-xs text-slate-300">A confirmation with the PDF went to {r.email} and an SMS to {r.phone}. Bookmark this page: it is your private link to your tickets.</p>
        {items.length > 0 && <p className="text-center text-xs text-slate-300">Please keep your registration confirmation email with you all the time during the workshop. Workshop questions: <a href={`mailto:${WORKSHOP_EMAIL}`} className="text-lnh-sky underline">{WORKSHOP_EMAIL}</a></p>}
      </div>
    </section>
  );
}
