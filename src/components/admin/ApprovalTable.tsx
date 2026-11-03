import { cn, fmtDateTime } from "@/lib/utils";
import { GUEST_ROLES } from "@/lib/reg-fields";
import type { Registration } from "@/lib/db/schema";

const TONE: Record<string, string> = { PENDING: "bg-amber-100 text-amber-800", APPROVED: "bg-emerald-100 text-emerald-800", REJECTED: "bg-rose-100 text-rose-700" };

/** Guests / volunteers awaiting approval (replaces the HOD's / Chairperson's signature and stamp on the paper form). */
export function ApprovalTable({ rows, action, kind }: { rows: Registration[]; action: (id: string, f: FormData) => Promise<void>; kind: "GUEST" | "VOLUNTEER" }) {
  if (!rows.length) return <p className="a-card p-10 text-center text-sm text-slate-400">No {kind === "GUEST" ? "guest" : "volunteer"} registrations yet. The public form is at /register/{kind === "GUEST" ? "guest" : "volunteer"}.</p>;
  return (
    <div className="a-card overflow-x-auto">
      <table className="a-table">
        <thead><tr><th>Registration</th><th>Person</th><th>{kind === "GUEST" ? "Role and session" : "Department · academic year"}</th><th>Status</th><th className="min-w-[280px]">Decision</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td><span className="font-mono text-xs font-semibold">{r.regNo}</span><span className="block text-[11px] text-slate-400">{fmtDateTime(r.createdAt)}</span></td>
            <td className="text-sm"><b>{r.title} {r.firstName} {r.lastName}</b><span className="block text-xs text-slate-500">{r.institution}{r.qualification ? ` · ${r.qualification}` : ""}</span><span className="block text-xs text-slate-500">{r.email} · {r.phone}{r.cnic ? ` · CNIC ${r.cnic}` : ""}</span></td>
            <td className="text-sm">{kind === "GUEST" ? <>{GUEST_ROLES[r.guestRole ?? ""] ?? r.guestRole}<span className="block text-xs text-slate-500">{r.guestSession}</span></> : <>{r.department}<span className="block text-xs text-slate-500">{r.academicYear}</span></>}</td>
            <td><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[r.approvalStatus ?? "PENDING"])}>{r.approvalStatus ?? "PENDING"}</span>{r.approvedAt && <span className="block text-[11px] text-slate-400">{r.approvedBy}, {fmtDateTime(r.approvedAt)}</span>}{r.approvalNote && <span className="block text-[11px] text-slate-500">“{r.approvalNote}”</span>}</td>
            <td>{r.approvalStatus === "PENDING" || !r.approvalStatus ? (
              <form action={action.bind(null, r.id)} className="flex flex-wrap items-center gap-1.5">
                <input name="note" placeholder="Note (optional)" className="a-input w-36 py-1 text-xs" />
                <button name="decision" value="APPROVE" className="a-btn bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700">Approve</button>
                <button name="decision" value="REJECT" className="a-btn border border-rose-200 px-3 py-1 text-xs text-rose-700">Decline</button>
              </form>) : <span className="text-xs text-slate-400">Decided</span>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
