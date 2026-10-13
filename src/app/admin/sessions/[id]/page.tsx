import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { feedbackStats } from "@/lib/feedbackStats";
import { PageTitle, Stat, StatusBadge, Empty } from "@/components/admin/ui";
import { LiveFeedback } from "@/components/admin/LiveFeedback";
import { appUrl, fmtDate, fmtTime, pkr, SESSION_TYPE_LABEL } from "@/lib/utils";
import { itemAttend } from "../../actions";

export default async function SessionDash({ params }: { params: { id: string } }) {
  const u = await requirePerm("sessions");
  const x = await db.query.sessions.findFirst({ where: eq(s.sessions.id, params.id), with: { speakers: { with: { speaker: true } } } });
  if (!x) notFound();
  const items = await db.query.registrationItems.findMany({ where: eq(s.registrationItems.sessionId, x.id), with: { registration: { with: { category: true } } }, orderBy: asc(s.registrationItems.id) });
  const active = items.filter((i) => ["PENDING", "PAID", "WAIVED"].includes(i.registration.paymentStatus));
  const paid = active.filter((i) => i.registration.paymentStatus !== "PENDING");
  const attended = items.filter((i) => i.attendedAt).length;
  const fbUrl = `${appUrl()}/feedback/${x.slug}`;
  const qr = await QRCode.toDataURL(fbUrl, { margin: 1, width: 480, color: { dark: "#0A2E6E", light: "#ffffff" } });
  const stats = await feedbackStats(x.id);
  return (
    <>
      <PageTitle title={x.title} sub={`${SESSION_TYPE_LABEL[x.type]} · Day ${x.day}, ${fmtDate(x.startsAt, { weekday: "long", day: "numeric", month: "long" })} · ${fmtTime(x.startsAt)}–${fmtTime(x.endsAt)} · ${x.hall ?? ""}`}
        actions={<>
          {can(u.role, "registrations") && <a href={`/api/admin/export/registrations?session=${x.id}`} className="a-btn-ghost">Export participants</a>}
          {can(u.role, "sessions.edit") && <Link href={`/admin/sessions/${x.id}/edit`} className="a-btn-primary">Edit session</Link>}
        </>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Registered" value={x.registrable ? `${active.length}${x.capacity ? ` / ${x.capacity}` : ""}` : "Open to all"} sub={x.capacity ? `${Math.max(0, x.capacity - active.length)} seats left` : undefined} />
        <Stat label="Confirmed (paid)" value={paid.length} sub={x.fee ? `${pkr(paid.reduce((a, i) => a + i.fee, 0))} collected` : undefined} accent="green" />
        <Stat label="Attended" value={attended} sub={paid.length ? `${Math.round((attended / paid.length) * 100)}% of confirmed` : undefined} accent="amber" />
        <Stat label="Feedback" value={stats.n} sub={stats.n ? `Avg ${stats.overall}/5 · ${stats.recommend}% recommend` : "Waiting for responses"} accent="red" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="a-card p-5 lg:col-span-2">
          <p className="mb-4 text-sm font-semibold text-slate-700">Real-time feedback</p>
          <LiveFeedback sessionId={x.id} initial={stats} />
        </div>
        <div className="a-card p-5 text-center">
          <p className="text-sm font-semibold text-slate-700">Feedback QR code</p>
          <p className="text-xs text-slate-500">Display on screen or print for the hall</p>
          <img src={qr} alt="Feedback QR" className="mx-auto mt-4 w-56" />
          <p className="mt-2 break-all font-mono text-[10px] text-slate-400">{fbUrl}</p>
          <div className="mt-4 flex justify-center gap-2">
            <a href={qr} download={`feedback-${x.slug}.png`} className="a-btn-ghost text-xs">Download PNG</a>
            <Link href={`/admin/sessions/${x.id}/qr`} target="_blank" className="a-btn-ghost text-xs">Full-screen / print</Link>
          </div>
          {!x.feedbackOpen && <p className="mt-3 text-xs font-semibold text-rose-600">Feedback is closed for this session</p>}
        </div>
      </div>
      {x.speakers.length > 0 && <p className="mt-6 text-sm text-slate-600"><b>Speakers:</b> {x.speakers.map((sp) => `${sp.speaker.title ?? ""} ${sp.speaker.name} (${sp.role})`).join(", ")}</p>}
      <div className="a-card mt-6 overflow-x-auto">
        <p className="px-5 py-4 text-sm font-semibold text-slate-700">Participants ({items.length})</p>
        <table className="a-table">
          <thead><tr><th>Reg no.</th><th>Name</th><th>Institution</th><th>Contact</th><th>Payment</th><th>Attendance</th></tr></thead>
          <tbody>{items.map((i) => (
            <tr key={i.id}>
              <td><Link href={`/admin/registrations/${i.registration.id}`} className="font-mono text-xs font-semibold text-lnh-blue">{i.registration.regNo}</Link></td>
              <td className="font-medium">{i.registration.title} {i.registration.firstName} {i.registration.lastName}<p className="text-xs text-slate-400">{i.registration.category.label}</p></td>
              <td className="text-slate-600">{i.registration.institution}</td>
              <td className="text-xs text-slate-500">{i.registration.email}<br />{i.registration.phone}</td>
              <td><StatusBadge s={i.registration.paymentStatus} /></td>
              <td>{can(u.role, "checkin") ? <form action={itemAttend.bind(null, i.id, !!i.attendedAt)}><button className={i.attendedAt ? "badge bg-emerald-100 text-emerald-700" : "a-btn-ghost py-1 text-xs"}>{i.attendedAt ? "✓ Present" : "Mark present"}</button></form> : i.attendedAt ? "Present" : "—"}</td>
            </tr>
          ))}</tbody>
        </table>
        {!items.length && <Empty>{x.registrable ? "No registrations yet." : "This session is open to all registrants — no pre-registration."}</Empty>}
      </div>
    </>
  );
}
