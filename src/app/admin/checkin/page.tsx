import Link from "next/link";
import { ilike, or, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PageTitle, StatusBadge, Empty } from "@/components/admin/ui";
import { fmtTime, fmtDate } from "@/lib/utils";
import { regCheckIn, itemAttend } from "../actions";
import { ScanInput } from "./ScanInput";
import { parseScan } from "@/lib/qr-payload";

export default async function CheckIn({ searchParams }: { searchParams: { q?: string } }) {
  await requirePerm("checkin");
  const raw = (searchParams.q || "").trim();
  const scan = raw ? parseScan(raw) : null;
  const q = scan?.regNo ?? "";
  const results = q
    ? await db.query.registrations.findMany({
        where: or(eq(s.registrations.regNo, q), ilike(s.registrations.email, `%${q}%`), ilike(s.registrations.phone, `%${q}%`), ilike(s.registrations.lastName, `%${q}%`), ilike(s.registrations.firstName, `%${q}%`)),
        with: { items: { with: { session: true } }, category: true }, limit: 10,
      })
    : [];
  return (
    <>
      <PageTitle title="Check-in desk" sub="Scan a Symposium Pass QR (symposium entry) or a workshop ticket QR (that workshop’s door), or search by registration no., name, email or phone." />
      <ScanInput initial={raw} />
      {scan?.ticketNo && (() => {
        const hit = results.flatMap((r) => r.items.map((i) => ({ r, i }))).find((x) => x.i.ticketNo === scan.ticketNo);
        if (!hit) return <div className="mt-4 rounded-xl border-l-4 border-l-rose-500 bg-white p-4 text-sm font-semibold text-rose-700">Workshop ticket {scan.ticketNo} not found.</div>;
        const paid = hit.r.paymentStatus === "PAID" || hit.r.paymentStatus === "WAIVED";
        return (
          <div className={`mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border-l-4 bg-white p-5 shadow-sm ${paid ? "border-l-emerald-500" : "border-l-amber-500"}`}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Workshop ticket · {hit.i.ticketNo}</p>
              <p className="font-display text-lg font-bold">{hit.i.session.title}</p>
              <p className="text-sm text-slate-600">{hit.r.title} {hit.r.firstName} {hit.r.lastName} · {fmtDate(hit.i.session.startsAt, { weekday: "short", day: "numeric", month: "short" })} {fmtTime(hit.i.session.startsAt)} · {hit.i.session.hall}</p>
              {!paid && <p className="mt-1 text-sm font-semibold text-amber-700">Payment pending: collect payment before admitting.</p>}
            </div>
            <form action={itemAttend.bind(null, hit.i.id, !!hit.i.attendedAt)}><button className={hit.i.attendedAt ? "a-btn-ghost" : "a-btn-red px-6"}>{hit.i.attendedAt ? "✓ Admitted — undo" : "Admit to workshop"}</button></form>
          </div>
        );
      })()}
      <div className="mt-6 space-y-4">
        {q && !results.length && <div className="a-card"><Empty>No registration matches “{q}”.</Empty></div>}
        {results.map((r) => {
          const approval = r.regType !== "PARTICIPANT" && r.approvalStatus !== "APPROVED";
          const ok = (r.paymentStatus === "PAID" || r.paymentStatus === "WAIVED") && !approval;
          return (
            <div key={r.id} className={`a-card overflow-hidden border-l-4 ${ok ? "border-l-emerald-500" : "border-l-amber-500"}`}>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-xs font-semibold text-lnh-blue">{r.regNo}</p>
                  <p className="font-display text-xl font-bold">{r.title} {r.firstName} {r.lastName}</p>
                  <p className="text-sm text-slate-500">{r.institution} · {r.regType === "PARTICIPANT" ? `${r.designation ?? ""} (${r.category.label})` : r.category.label}{r.hasPass ? ` · Symposium Pass${r.regType === "PARTICIPANT" ? ` · Banquet × ${1 + r.banquetQty}` : ""}` : " · Workshop tickets only (no symposium entry)"}</p>
                  <div className="mt-2 flex items-center gap-2"><StatusBadge s={r.paymentStatus} />{approval ? <span className="text-xs font-semibold text-rose-700">{r.approvalStatus === "REJECTED" ? "Registration declined — no entry" : "Awaiting approval — no entry yet"}</span> : !ok && <span className="text-xs font-semibold text-amber-700">Collect payment before issuing kit</span>}</div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/registrations/${r.id}`} className="a-btn-ghost">Details</Link>
                  <form action={regCheckIn.bind(null, r.id, !!r.checkedInAt)}><button disabled={(approval || !r.hasPass) && !r.checkedInAt} title={!r.hasPass ? "No Symposium Pass: workshop tickets only" : undefined} className={r.checkedInAt ? "a-btn-ghost" : "a-btn-red px-6 disabled:opacity-40"}>{r.checkedInAt ? "✓ Checked in — undo" : "Check in"}</button></form>
                </div>
              </div>
              {r.items.length > 0 && (
                <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/50">
                  {r.items.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                      <span><span className="mr-1 font-mono text-xs text-slate-500">{i.ticketNo}</span>{i.session.title} <span className="text-xs text-slate-400">· {fmtDate(i.session.startsAt, { weekday: "short" })} {fmtTime(i.session.startsAt)} · {i.session.hall}</span></span>
                      <form action={itemAttend.bind(null, i.id, !!i.attendedAt)}><button className={i.attendedAt ? "badge bg-emerald-100 text-emerald-700" : "a-btn-ghost py-1 text-xs"}>{i.attendedAt ? "✓ Attended" : "Mark attended"}</button></form>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
