import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { loadRegistration } from "@/lib/registration";
import { PageTitle, StatusBadge } from "@/components/admin/ui";
import { fmtDateTime, pkr } from "@/lib/utils";
import { regMarkPaid, regSetStatus, regResend, regNotes, regCheckIn, itemAttend } from "../../actions";

export default async function RegDetail({ params }: { params: { id: string } }) {
  const u = await requirePerm("registrations");
  const r = await loadRegistration({ id: params.id });
  if (!r) notFound();
  const edit = can(u.role, "registrations.edit");
  const logs = await db.select().from(s.notificationLog).where(eq(s.notificationLog.to, r.email)).orderBy(desc(s.notificationLog.createdAt)).limit(10);
  const paid = r.paymentStatus === "PAID" || r.paymentStatus === "WAIVED";
  return (
    <>
      <PageTitle title={`${r.title} ${r.firstName} ${r.lastName}`} sub={`${r.regNo} · registered ${fmtDateTime(r.createdAt)}`}
        actions={<>
          <a className="a-btn-ghost" href={`/api/registrations/${r.accessToken}/pdf`} target="_blank">Confirmation PDF</a>
          {r.certificateNo && <a className="a-btn-ghost" href={`/api/certificates/${r.accessToken}`} target="_blank">Certificate</a>}
          {edit && <form action={regResend.bind(null, r.id)}><button className="a-btn-ghost">Resend email + SMS</button></form>}
        </>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="a-card p-5">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {[["Email", r.email], ["Contact", r.phone], ["Gender", r.gender], ["PMDC no.", r.pmdcNo], ["Specialty", r.specialty], ["Designation", r.designation], ["Institution", r.institution], ["Address", [r.address, r.city].filter(Boolean).join(", ")], ["Category", r.category.label], ["Early-bird", r.earlyBird ? "Yes" : "No"], ["Registered", r.source === "ONSITE" ? "At the onsite desk" : "Online"], ["LNH employee ID", r.employeeId]].map(([k, v]) => (
                <div key={k as string}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-800">{v || "—"}</dd></div>
              ))}
            </dl>
          </div>
          <div className="a-card overflow-hidden">
            <p className="px-5 py-4 text-sm font-semibold text-slate-700">Sessions & attendance</p>
            <table className="a-table">
              <thead><tr><th>Session</th><th>Fee</th><th>Attended</th></tr></thead>
              <tbody>
                <tr><td>Conference registration</td><td>{pkr(r.conferenceFee)}</td><td /></tr>
                {r.items.map((i) => (
                  <tr key={i.id}>
                    <td>{i.session.title}<p className="text-xs text-slate-400">{fmtDateTime(i.session.startsAt)} · {i.session.hall}</p></td>
                    <td>{i.fee ? pkr(i.fee) : "Included"}</td>
                    <td>{can(u.role, "checkin") ? <form action={itemAttend.bind(null, i.id, !!i.attendedAt)}><button className={i.attendedAt ? "badge bg-emerald-100 text-emerald-700" : "a-btn-ghost py-1 text-xs"}>{i.attendedAt ? `✓ ${fmtDateTime(i.attendedAt)}` : "Mark attended"}</button></form> : i.attendedAt ? "Yes" : "—"}</td>
                  </tr>
                ))}
                <tr><td className="font-semibold">Total</td><td className="font-bold">{pkr(r.totalFee)}</td><td /></tr>
              </tbody>
            </table>
          </div>
          <div className="a-card overflow-hidden">
            <p className="px-5 py-4 text-sm font-semibold text-slate-700">Payments</p>
            <table className="a-table"><thead><tr><th>Ref</th><th>Provider</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>{r.payments.map((p) => <tr key={p.id}><td className="font-mono text-xs">{p.txnRef}{p.providerRef && <p className="text-slate-400">{p.providerRef}</p>}</td><td>{p.provider}</td><td>{pkr(p.amount)}</td><td><StatusBadge s={p.status} /></td><td className="text-xs">{fmtDateTime(p.createdAt)}</td></tr>)}
                {!r.payments.length && <tr><td colSpan={5} className="text-center text-slate-400">No payment attempts</td></tr>}</tbody></table>
          </div>
          <div className="a-card overflow-hidden">
            <p className="px-5 py-4 text-sm font-semibold text-slate-700">Recent emails to this participant</p>
            <ul className="divide-y divide-slate-100 text-sm">{logs.map((l) => <li key={l.id} className="flex justify-between gap-3 px-5 py-2.5"><span className="truncate">{l.subject}</span><span className="flex shrink-0 items-center gap-2 text-xs text-slate-400"><StatusBadge s={l.status} />{fmtDateTime(l.createdAt)}</span></li>)}</ul>
          </div>
        </div>
        <div className="space-y-6">
          <div className="a-card p-5">
            <p className="text-xs text-slate-500">Payment status</p>
            <div className="mt-1 flex items-center gap-2"><StatusBadge s={r.paymentStatus} /><span className="font-display text-xl font-bold">{pkr(r.totalFee)}</span></div>
            {r.paidAt && <p className="mt-1 text-xs text-slate-500">Paid {fmtDateTime(r.paidAt)} via {r.paymentMethod}</p>}
            {edit && !paid && (
              <form action={regMarkPaid.bind(null, r.id)} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-600">Record manual payment</p>
                <select name="method" className="a-input"><option>Cash at desk</option><option>Bank transfer</option><option>Cheque</option><option>Card at desk</option></select>
                <input name="ref" placeholder="Receipt / transfer reference" className="a-input" />
                <button className="a-btn-primary w-full">Mark as paid & notify</button>
              </form>
            )}
            {edit && (
              <div className="mt-3 flex flex-wrap gap-2">
                {!paid && <form action={regSetStatus.bind(null, r.id, "WAIVED")}><button className="a-btn-ghost text-xs">Waive fee</button></form>}
                {r.paymentStatus === "PAID" && <form action={regSetStatus.bind(null, r.id, "REFUNDED")}><button className="a-btn-ghost text-xs">Mark refunded</button></form>}
                {r.paymentStatus === "PENDING" && <form action={regSetStatus.bind(null, r.id, "FAILED")}><button className="a-btn-ghost text-xs">Cancel (frees seats)</button></form>}
                {["FAILED", "REFUNDED"].includes(r.paymentStatus) && <form action={regSetStatus.bind(null, r.id, "PENDING")}><button className="a-btn-ghost text-xs">Re-open</button></form>}
              </div>
            )}
          </div>
          <div className="a-card p-5">
            <p className="text-xs text-slate-500">Event check-in</p>
            <p className="mt-1 font-semibold">{r.checkedInAt ? `Checked in ${fmtDateTime(r.checkedInAt)}` : "Not checked in"}</p>
            {can(u.role, "checkin") && <form action={regCheckIn.bind(null, r.id, !!r.checkedInAt)} className="mt-3"><button className={r.checkedInAt ? "a-btn-ghost" : "a-btn-red"}>{r.checkedInAt ? "Undo check-in" : "Check in now"}</button></form>}
            {r.certificateNo && <p className="mt-4 text-xs text-slate-500">Certificate <b className="text-slate-800">{r.certificateNo}</b></p>}
          </div>
          {edit && (
            <form action={regNotes.bind(null, r.id)} className="a-card space-y-2 p-5">
              <label className="a-label" htmlFor="notes">Internal notes</label>
              <textarea id="notes" name="notes" defaultValue={r.notes ?? ""} rows={4} className="a-input" />
              <button className="a-btn-ghost">Save notes</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
