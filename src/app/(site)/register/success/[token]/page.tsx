import { notFound } from "next/navigation";
import { CheckCircle2, Clock, Download, Mail, MessageSquare } from "lucide-react";
import QRCode from "qrcode";
import { loadRegistration } from "@/lib/registration";
import { provider, BANK_DETAILS } from "@/lib/payments";
import { appUrl, fmtDate, fmtTime, pkr } from "@/lib/utils";
import { Alert } from "@/components/ui/Field";
import { PayButton } from "./PayButton";
import { qrPayload } from "@/lib/qr-payload";

export const metadata = { title: "Your registration", robots: { index: false } };

export default async function Success({ params, searchParams }: { params: { token: string }; searchParams: { paid?: string; failed?: string } }) {
  const r = await loadRegistration({ accessToken: params.token });
  if (!r) notFound();
  const confirmed = r.paymentStatus === "PAID" || r.paymentStatus === "WAIVED";
  const qr = await QRCode.toDataURL(qrPayload(r), { margin: 1, width: 280, color: { dark: "#040B1E", light: "#ffffff" } });
  const prov = provider();
  return (
    <section className="relative overflow-hidden pb-10 pt-36">
      <div className="orb -left-20 top-0 h-96 w-96 bg-lnh-blue/30" />
      <div className="orb right-0 top-40 h-80 w-80 bg-lnh-red/20" />
      <div className="container-x relative max-w-4xl">
        {searchParams.failed && <Alert className="mb-6">Payment was not completed. You can try again below.</Alert>}
        <div className="card overflow-hidden">
          <div className={`flex items-center gap-3 px-6 py-4 text-sm font-semibold sm:px-10 ${confirmed ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
            {confirmed ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            {confirmed ? "Registration confirmed" : "Registration received — payment pending"}
          </div>
          <div className="grid gap-8 p-6 sm:p-10 md:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow">Registration number</p>
              <p className="h-display mt-3 text-5xl text-white sm:text-6xl">{r.regNo}</p>
              <p className="mt-4 text-lg text-slate-300">{r.title} {r.firstName} {r.lastName}</p>
              <p className="text-sm text-slate-500">{r.institution} · {r.category.label}</p>
              <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-lnh-sky" />PDF emailed to {r.email}</span>
                <span className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4 text-lnh-sky" />SMS sent to {r.phone}</span>
              </div>
            </div>
            <div className="text-center">
              <img src={qr} alt="Registration QR code" className="mx-auto h-40 w-40 rounded-2xl bg-white p-2" />
              <p className="mt-2 text-[11px] text-slate-500">Show at the registration desk</p>
            </div>
          </div>
          <div className="border-t border-white/10 p-6 sm:p-10">
            <p className="eyebrow mb-4">Fee summary</p>
            <div className="flex justify-between py-1.5 text-sm"><span className="text-slate-300">Conference registration{r.earlyBird ? " (early-bird)" : ""}</span><span className="text-white">{pkr(r.conferenceFee)}</span></div>
            {r.items.map((i) => (
              <div key={i.id} className="flex justify-between gap-4 py-1.5 text-sm">
                <span className="text-slate-300">{i.session.title}<span className="block text-xs text-slate-500">{fmtDate(i.session.startsAt, { weekday: "short", day: "numeric", month: "short" })} · {fmtTime(i.session.startsAt)} · {i.session.hall}</span></span>
                <span className="shrink-0 text-white">{i.fee ? pkr(i.fee) : "Included"}</span>
              </div>
            ))}
            <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-4"><span className="font-semibold uppercase tracking-wider text-white">Total</span><span className="font-display text-3xl font-bold text-lnh-rose">{pkr(r.totalFee)}</span></div>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-white/10 p-6 sm:p-10">
            {!confirmed && prov !== "manual" && <PayButton token={r.accessToken} amount={pkr(r.totalFee)} />}
            <a href={`/api/registrations/${r.accessToken}/pdf`} className="btn-ghost"><Download className="h-4 w-4" />Download PDF</a>
            {r.certificateNo && <a href={`/api/certificates/${r.accessToken}`} className="btn-blue">Download e-certificate</a>}
          </div>
          {!confirmed && (
            <div className="border-t border-white/10 p-6 text-sm text-slate-400 sm:px-10">
              <p className="mb-2 font-semibold text-white">{prov === "manual" ? "Payment by bank transfer" : "Prefer bank transfer?"}</p>
              <ul className="space-y-1">{BANK_DETAILS.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-slate-500">Bookmark this page — it is your private link to your registration.</p>
      </div>
    </section>
  );
}
