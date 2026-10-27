import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { allInvites } from "@/lib/invitations";
import { PageTitle } from "@/components/admin/ui";
import { INVITE_LABEL } from "@/lib/scientific";
import { cn, fmtDateTime } from "@/lib/utils";
import { remindAll, resendOne, sendAllInvites, withdraw } from "./actions";

export const metadata = { title: "Invitations" };
const TONE: Record<string, string> = { NOT_SENT: "bg-slate-100 text-slate-600", SENT: "bg-amber-100 text-amber-800", ACCEPTED: "bg-emerald-100 text-emerald-700", DECLINED: "bg-rose-100 text-rose-700", FAILED: "bg-rose-200 text-rose-800", WITHDRAWN: "bg-slate-200 text-slate-500" };

export default async function Invitations({ searchParams }: { searchParams: { status?: string; sent?: string; failed?: string; reminded?: string } }) {
  await requirePerm("invitations");
  const all = await allInvites();
  const by = (k: string) => all.filter((i) => i.status === k).length;
  const reminders = all.reduce((a, i) => a + i.reminders, 0);
  const list = searchParams.status ? all.filter((i) => (searchParams.status === "REMINDED" ? i.reminders > 0 : i.status === searchParams.status)) : all;
  const tiles: [string, string, number][] = [["NOT_SENT", "Not sent", by("NOT_SENT")], ["SENT", "No response", by("SENT")], ["ACCEPTED", "Accepted", by("ACCEPTED")], ["DECLINED", "Declined", by("DECLINED")], ["REMINDED", "Reminders sent", reminders], ["FAILED", "Delivery failed", by("FAILED")], ["WITHDRAWN", "Withdrawn", by("WITHDRAWN")]];
  return (
    <>
      <PageTitle title="Invitations" sub="Chairs, co-chairs, moderators, panelists, guest speakers and oral presenters of approved, scheduled sessions, plus accepted posters. Each email carries the session, date, time slot and venue, with accept and decline links."
        actions={<>
          <form action={sendAllInvites}><button disabled={!by("NOT_SENT")} className="a-btn-red">Send {by("NOT_SENT")} pending invitation{by("NOT_SENT") === 1 ? "" : "s"}</button></form>
          <form action={remindAll}><button disabled={!by("SENT")} className="a-btn-ghost">Remind non-responders</button></form>
        </>} />
      {searchParams.sent && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{searchParams.sent} sent{Number(searchParams.failed) ? `, ${searchParams.failed} failed` : ""}.</p>}
      {searchParams.reminded && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{searchParams.reminded} reminder(s) sent to people who had not answered for 3 days or more.</p>}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {tiles.map(([k, l, n]) => <Link key={k} href={`/admin/invitations?status=${k}`} className={cn("a-card p-3", searchParams.status === k && "border-lnh-blue")}><p className="font-display text-2xl font-bold">{n}</p><p className="text-xs text-slate-500">{l}</p></Link>)}
      </div>
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Name</th><th>Role</th><th>Session</th><th>Status</th><th>Sent</th><th>Answered</th><th /></tr></thead>
          <tbody>{list.map((i) => (
            <tr key={i.kind + i.id}>
              <td className="font-medium">{i.name}<span className="block text-xs text-slate-400">{i.email ?? "no email"}</span></td>
              <td className="text-xs">{i.role}</td>
              <td className="max-w-xs text-xs">{i.session}<span className="block text-slate-400">{i.when}{i.venue ? ` · ${i.venue}` : ""}</span></td>
              <td><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[i.status])}>{INVITE_LABEL[i.status]}</span>{i.reminders > 0 && <span className="ml-1 text-[11px] text-slate-500">{i.reminders} reminder{i.reminders > 1 ? "s" : ""}</span>}{i.note && <span className="block text-[11px] text-slate-500">“{i.note}”</span>}</td>
              <td className="whitespace-nowrap text-xs text-slate-500">{i.invitedAt ? fmtDateTime(i.invitedAt) : "—"}</td>
              <td className="whitespace-nowrap text-xs text-slate-500">{i.respondedAt ? fmtDateTime(i.respondedAt) : "—"}</td>
              <td className="whitespace-nowrap text-right text-xs">
                {i.status !== "WITHDRAWN" && <form action={resendOne.bind(null, i.kind, i.id)} className="inline"><button className="font-semibold text-lnh-blue hover:underline">{i.status === "NOT_SENT" ? "Send" : "Resend"}</button></form>}
                {i.status !== "WITHDRAWN" && <form action={withdraw.bind(null, i.kind, i.id)} className="ml-2 inline"><button className="text-slate-500 hover:underline">Withdraw</button></form>}
              </td>
            </tr>
          ))}</tbody>
        </table>
        {!list.length && <p className="p-8 text-center text-sm text-slate-400">No invitations yet. Approve and schedule sessions in the scientific programme, and accept posters, to build the list.</p>}
      </div>
    </>
  );
}
