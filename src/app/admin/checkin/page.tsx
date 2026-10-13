import Link from "next/link";
import { ilike, or, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PageTitle, StatusBadge, Empty } from "@/components/admin/ui";
import { fmtTime, fmtDate } from "@/lib/utils";
import { regCheckIn, itemAttend } from "../actions";
import { ScanInput } from "./ScanInput";

export default async function CheckIn({ searchParams }: { searchParams: { q?: string } }) {
  await requirePerm("checkin");
  const raw = (searchParams.q || "").trim();
  const q = raw.match(/LNH\d{2}-\d{3,}/i)?.[0]?.toUpperCase() ?? raw;
  const results = q
    ? await db.query.registrations.findMany({
        where: or(eq(s.registrations.regNo, q), ilike(s.registrations.email, `%${q}%`), ilike(s.registrations.phone, `%${q}%`), ilike(s.registrations.lastName, `%${q}%`), ilike(s.registrations.firstName, `%${q}%`)),
        with: { items: { with: { session: true } }, category: true }, limit: 10,
      })
    : [];
  return (
    <>
      <PageTitle title="Check-in desk" sub="Scan the QR code on a participant’s confirmation, or search by registration no., name, email or phone." />
      <ScanInput initial={raw} />
      <div className="mt-6 space-y-4">
        {q && !results.length && <div className="a-card"><Empty>No registration matches “{q}”.</Empty></div>}
        {results.map((r) => {
          const ok = r.paymentStatus === "PAID" || r.paymentStatus === "WAIVED";
          return (
            <div key={r.id} className={`a-card overflow-hidden border-l-4 ${ok ? "border-l-emerald-500" : "border-l-amber-500"}`}>
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-xs font-semibold text-lnh-blue">{r.regNo}</p>
                  <p className="font-display text-xl font-bold">{r.title} {r.firstName} {r.lastName}</p>
                  <p className="text-sm text-slate-500">{r.institution} · {r.category.label}</p>
                  <div className="mt-2 flex items-center gap-2"><StatusBadge s={r.paymentStatus} />{!ok && <span className="text-xs font-semibold text-amber-700">Collect payment before issuing kit</span>}</div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/admin/registrations/${r.id}`} className="a-btn-ghost">Details</Link>
                  <form action={regCheckIn.bind(null, r.id, !!r.checkedInAt)}><button className={r.checkedInAt ? "a-btn-ghost" : "a-btn-red px-6"}>{r.checkedInAt ? "✓ Checked in — undo" : "Check in"}</button></form>
                </div>
              </div>
              {r.items.length > 0 && (
                <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/50">
                  {r.items.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                      <span>{i.session.title} <span className="text-xs text-slate-400">· {fmtDate(i.session.startsAt, { weekday: "short" })} {fmtTime(i.session.startsAt)} · {i.session.hall}</span></span>
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
