import { asc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { getEvent } from "@/lib/event";
import { reviewWindow } from "@/lib/abstracts";
import { PageTitle } from "@/components/admin/ui";
import { DeptLoginsPanel, ResetLogin } from "@/components/admin/DeptLogins";
import { fmtDateTime } from "@/lib/utils";
import { addDepartment, toggleDepartment } from "./actions";
import { reopenDept } from "../abstracts/actions";

export const metadata = { title: "Departments" };

export default async function Departments() {
  await requirePerm("departments");
  const ev = await getEvent();
  const w = reviewWindow(ev);
  const rows = await db.select({
    d: s.departments,
    login: sql<string | null>`(select email from users u where u.role = 'HOD' and u.department = departments.name limit 1)`,
    lastLogin: sql<Date | null>`(select last_login_at from users u where u.role = 'HOD' and u.department = departments.name limit 1)`,
    total: sql<number>`(select count(*) from abstracts a where a.assigned_dept = departments.name)::int`,
    pending: sql<number>`(select count(*) from abstracts a where a.assigned_dept = departments.name and a.status = 'SUBMITTED' and a.hod_decision is null)::int`,
    sessions: sql<number>`(select count(*) from sessions se where se.department = departments.name and se.proposal)::int`,
  }).from(s.departments).orderBy(asc(s.departments.order), asc(s.departments.name));
  const withAbs = rows.filter((r) => r.total > 0);
  return (
    <>
      <PageTitle title="Departments" sub={`${rows.length} specialities · Phase 1 ${w.p1 ? "open" : "closed"} · Phase 2 ${w.p2 ? "open" : "closed"} (dates in Event Settings)`} />
      <DeptLoginsPanel />
      <div className="a-card mt-6 overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Department</th><th>Login</th><th>Abstracts</th><th>Phase 1</th><th>Phase 2</th><th>Session proposals</th><th /></tr></thead>
          <tbody>{rows.map(({ d, login, lastLogin, total, pending, sessions }) => (
            <tr key={d.id} className={d.active ? "" : "opacity-50"}>
              <td className="font-medium">{d.name}</td>
              <td className="text-xs">{login ? <><span className="font-mono">{login}</span><span className="block text-slate-400">{lastLogin ? `last in ${fmtDateTime(lastLogin)}` : "never signed in"}</span><ResetLogin dept={d.name} /></> : <span className="text-slate-400">none</span>}</td>
              <td className="text-sm">{total}{pending > 0 && <span className="ml-1 text-xs text-amber-700">({pending} undecided)</span>}</td>
              <td className="text-xs">{d.p1SubmittedAt ? <>sent {fmtDateTime(d.p1SubmittedAt)} <form action={reopenDept.bind(null, d.id, 1)} className="inline"><button className="text-lnh-blue hover:underline">reopen</button></form></> : total ? "open" : "—"}</td>
              <td className="text-xs">{d.p2Required ? d.p2SubmittedAt ? `sent ${fmtDateTime(d.p2SubmittedAt)}` : "assigned, pending" : "—"}</td>
              <td className="text-sm">{sessions}</td>
              <td><form action={toggleDepartment.bind(null, d.id, !d.active)}><button className="text-xs text-slate-500 hover:underline">{d.active ? "Deactivate" : "Activate"}</button></form></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <form action={addDepartment} className="a-card mt-4 flex gap-2 p-4"><input name="name" placeholder="Add a department…" className="a-input" /><button className="a-btn-ghost">Add</button></form>
      <p className="mt-3 text-xs text-slate-400">{withAbs.length} departments have abstracts. A department login can only see its own abstracts and sessions.</p>
    </>
  );
}
