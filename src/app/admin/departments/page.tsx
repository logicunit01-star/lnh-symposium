import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { getEvent } from "@/lib/event";
import { reviewWindow } from "@/lib/abstracts";
import { can, DEPT_ROLE_LABEL, type DeptRole } from "@/lib/permissions";
import { PageTitle } from "@/components/admin/ui";
import { DeptLoginsPanel, ResetLogin } from "@/components/admin/DeptLogins";
import { cn, fmtDateTime } from "@/lib/utils";
import { addDepartment, mergeDepartment, saveDepartment, toggleDepartment } from "./actions";
import { reopenDept } from "../abstracts/actions";

export const metadata = { title: "Departments" };
export const dynamic = "force-dynamic";

const KIND: Record<string, string> = { CLINICAL: "Clinical", NON_CLINICAL: "Non-clinical", ALLIED: "Allied health", COMMITTEE: "Committee" };

/**
 * Departments (15 Nov 2026): the one list every form picks from. Every department field in the database must hold a
 * name from here, and renaming a department here updates all of them. Super Admin / Admin edit, rename and merge.
 */
export default async function Departments({ searchParams: sp }: { searchParams: { e?: string; saved?: string; err?: string; q?: string; show?: string } }) {
  const u = await requirePerm("departments");
  const edit = can(u, "settings");
  const logins = can(u, "users"); // issue / reset department passcodes: Super Admin only
  const ev = await getEvent();
  const w = reviewWindow(ev);
  const rows = await db.select({
    d: s.departments,
    total: sql<number>`(select count(*) from abstracts a where a.assigned_dept = departments.name)::int`,
    pending: sql<number>`(select count(*) from abstracts a where a.assigned_dept = departments.name and a.status = 'SUBMITTED' and a.hod_decision is null)::int`,
    sessions: sql<number>`(select count(*) from sessions se where se.department = departments.name and se.proposal)::int`,
    workshops: sql<number>`(select count(*) from sessions se where se.department = departments.name and se.type = 'WORKSHOP')::int`,
    guests: sql<number>`(select count(*) from registrations r where r.department = departments.name and r.reg_type = 'GUEST')::int`,
  }).from(s.departments).orderBy(asc(s.departments.order), asc(s.departments.name));
  const people = await db.select({ dept: s.userDepartments.department, role: s.userDepartments.role, id: s.users.id, name: s.users.name, email: s.users.email, active: s.users.active, last: s.users.lastLoginAt })
    .from(s.userDepartments).innerJoin(s.users, eq(s.users.id, s.userDepartments.userId)).orderBy(asc(s.userDepartments.role), asc(s.users.name));
  const of = (name: string) => people.filter((p) => p.dept === name);
  const shared = (name: string) => of(name).find((p) => p.role === "HEAD" && p.email.endsWith(".dept@lnh-symposium.local"));
  const review = rows.filter((r) => r.d.needsReview);
  const shown = rows.filter(({ d }) => (sp.show === "all" || d.active || d.needsReview) && (!sp.q || d.name.toLowerCase().includes(sp.q.toLowerCase()) || (d.code ?? "").toLowerCase() === sp.q.toLowerCase()));
  const sel = sp.e ? rows.find((r) => String(r.d.id) === sp.e) ?? null : null;
  const log = sel ? await db.select().from(s.staffAudit).where(eq(s.staffAudit.target, `Department ${sel.d.name}`)).orderBy(desc(s.staffAudit.createdAt)).limit(10) : [];

  return (
    <>
      <PageTitle title="Departments" sub={`${rows.filter((r) => r.d.active).length} active departments · Phase 1 ${w.p1 ? "open" : "closed"} · Phase 2 ${w.p2 ? "open" : "closed"} (dates in Event Settings). Every form picks departments from this list.`} />
      {sp.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{sp.saved === "merged" ? "Merged. Every record now uses this department." : "Saved."}</p>}
      {sp.err && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{sp.err}</p>}
      {review.length > 0 && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{review.length} department name{review.length === 1 ? "" : "s"} came from records that did not match the list ({review.map((r) => `“${r.d.name}”`).join(", ")}). Open each one and rename it or merge it into the right department.</p>}
      {logins && <DeptLoginsPanel />}

      {/* layout fix 16 Nov 2026: the table uses the full width; the editor column appears only while a department is open
          (above it, in two columns on wide screens) */}
      <div className="mt-6 grid gap-6">
        <div className="space-y-3">
          <form className="flex flex-wrap gap-2"><input name="q" defaultValue={sp.q} placeholder="Search department or code…" className="a-input max-w-xs" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show" value="all" defaultChecked={sp.show === "all"} />Show inactive</label><button className="a-btn-ghost">Filter</button></form>
          <p className="text-xs text-slate-500">{edit ? "Choose Edit to rename a department, set its code, type and email, see its people, or merge a duplicate. " : ""}Deactivated departments disappear from forms but keep their records; departments cannot be deleted, only merged.</p>
          <div className="a-card overflow-x-auto">
            <table className="a-table">
              <thead><tr><th>Department</th><th>People</th><th>Department login</th><th>Abstracts</th><th>Phase 1 / 2</th><th>Sessions · Workshops · Guests</th><th /></tr></thead>
              <tbody>{shown.map(({ d, total, pending, sessions, workshops, guests }) => {
                const login = shared(d.name);
                const team = of(d.name).filter((p) => p !== login);
                return (
                  <tr key={d.id} className={cn(!d.active && "opacity-50", sel?.d.id === d.id && "bg-lnh-blue/5")}>
                    <td><span className="font-medium">{d.name}</span>{d.code && <span className="ml-1.5 font-mono text-xs text-slate-500">{d.code}</span>}
                      <span className="block text-xs text-slate-500">{KIND[d.kind] ?? d.kind}{d.needsReview && <span className="badge ml-1 bg-amber-100 text-amber-800">Needs review</span>}</span></td>
                    <td className="text-xs">{team.map((p) => <span key={p.id} className={cn("block", !p.active && "line-through opacity-60")}><Link href={`/admin/users?u=${p.id}`} className="hover:underline">{p.name}</Link> <span className="text-slate-400">· {DEPT_ROLE_LABEL[p.role as DeptRole]}</span></span>)}
                      {!team.length && <span className="text-slate-400">—</span>}</td>
                    <td className="text-xs">{login ? <><span className="font-mono">{login.email}</span><span className="block text-slate-400">{login.last ? `last in ${fmtDateTime(login.last)}` : "never signed in"}</span>{logins && <ResetLogin dept={d.name} />}</> : d.kind === "COMMITTEE" ? "—" : <span className="text-slate-400">none</span>}</td>
                    <td className="text-sm">{total}{pending > 0 && <span className="ml-1 text-xs text-amber-700">({pending} undecided)</span>}</td>
                    <td className="text-xs">{d.p1SubmittedAt ? <>P1 sent {fmtDateTime(d.p1SubmittedAt)} <form action={reopenDept.bind(null, d.id, 1)} className="inline"><button className="text-lnh-blue hover:underline">reopen</button></form></> : total ? "P1 open" : "—"}
                      {d.p2Required && <span className="block">{d.p2SubmittedAt ? `P2 sent ${fmtDateTime(d.p2SubmittedAt)}` : "P2 assigned, pending"}</span>}</td>
                    <td className="text-sm">{sessions} · {workshops} · {guests}</td>
                    <td className="whitespace-nowrap">{edit && <Link href={`/admin/departments?e=${d.id}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}${sp.show ? "&show=all" : ""}`} className="text-xs font-semibold text-lnh-blue hover:underline">Edit</Link>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
            {!shown.length && <p className="p-6 text-center text-sm text-slate-400">No department matches.</p>}
          </div>
          {edit && (
            <form action={addDepartment} className="a-card flex flex-wrap gap-2 p-4">
              <input name="name" placeholder="New department name (check the spelling)" className="a-input min-w-[240px] flex-1" />
              <select name="kind" defaultValue="CLINICAL" className="a-input w-auto">{Object.entries(KIND).filter(([k]) => k !== "COMMITTEE").map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <button className="a-btn-ghost">Add department</button>
            </form>
          )}
        </div>

        {sel && edit ? <aside className="order-first grid gap-4 lg:grid-cols-2 [&>*]:self-start">
          {sel && edit ? (
            <>
              <form key={`${sel.d.id}-${sel.d.name}-${sp.saved ?? ""}-${sp.err ?? ""}`} action={saveDepartment.bind(null, sel.d.id)} className="a-card space-y-3 p-5">
                <h2 className="font-display text-base font-bold">Edit {sel.d.name}</h2>
                <div><label className="a-label">Name</label><input name="name" required defaultValue={sel.d.name} className="a-input" />
                  <p className="mt-1 text-xs text-slate-500">Renaming updates every user, workshop, session, abstract and guest that uses this department.</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="a-label">Short code</label><input name="code" defaultValue={sel.d.code ?? ""} placeholder="e.g. CARD" className="a-input font-mono uppercase" /></div>
                  <div><label className="a-label">Type</label><select name="kind" defaultValue={sel.d.kind} className="a-input">{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                </div>
                <div><label className="a-label">Department email</label><input name="email" type="email" defaultValue={sel.d.email ?? ""} className="a-input" />
                  <p className="mt-1 text-xs text-slate-500">Department notifications (agenda, flyers, guests) go here and to its people's own email addresses. The shared department login has no mailbox.</p></div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div><label className="a-label">Order in lists</label><input name="order" type="number" defaultValue={sel.d.order} className="a-input" /></div>
                  <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={sel.d.active} />Active (shown in forms)</label>
                </div>
                <div className="flex gap-2"><button className="a-btn-primary">Save</button><Link href="/admin/departments" className="a-btn-ghost">Close</Link></div>
              </form>
              <div className="a-card p-5">
                <h2 className="font-display text-base font-bold">People</h2>
                {of(sel.d.name).length ? <ul className="mt-2 space-y-1 text-sm">{of(sel.d.name).map((p) => <li key={p.id}><Link href={`/admin/users?u=${p.id}`} className="font-medium hover:underline">{p.name}</Link> <span className="text-xs text-slate-500">· {DEPT_ROLE_LABEL[p.role as DeptRole]}{!p.active && " · inactive"}</span></li>)}</ul>
                  : <p className="mt-2 text-sm text-slate-400">Nobody yet.</p>}
                <p className="mt-3 text-xs text-slate-500">Add or change people in <Link href={`/admin/users?dept=${encodeURIComponent(sel.d.name)}`} className="text-lnh-blue hover:underline">Users &amp; roles</Link>.</p>
              </div>
              <form action={mergeDepartment.bind(null, sel.d.id)} className="a-card space-y-3 p-5">
                <h2 className="font-display text-base font-bold">Merge into another department</h2>
                <p className="text-xs text-slate-500">For a duplicate or misspelt department: moves its people, workshops, sessions, abstracts and guests to the chosen department, then removes “{sel.d.name}”.</p>
                <select name="into" defaultValue="" className="a-input"><option value="" disabled>Choose the correct department…</option>{rows.filter((r) => r.d.id !== sel.d.id && !r.d.needsReview).map((r) => <option key={r.d.id}>{r.d.name}</option>)}</select>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" />I understand this cannot be undone</label>
                <button className="a-btn-ghost text-rose-700">Merge</button>
              </form>
              <div className="a-card p-5">
                <h2 className="font-display text-base font-bold">Change log</h2>
                {log.length ? <ul className="mt-2 space-y-2 text-xs">{log.map((l) => <li key={l.id}><span className="text-slate-500">{fmtDateTime(l.createdAt)} · {l.actor}</span><br />{l.action}{l.detail ? `: ${l.detail}` : ""}</li>)}</ul> : <p className="mt-2 text-xs text-slate-400">No changes recorded yet.</p>}
              </div>
              {!sel.d.active && <form action={toggleDepartment.bind(null, sel.d.id, true)}><button className="text-xs font-semibold text-lnh-blue hover:underline">Activate</button></form>}
            </>
          ) : (
            <div className="a-card p-5 text-sm text-slate-600">
              <p>Super Admin and Admin can edit departments.</p>
              <p className="mt-3 text-xs text-slate-500">Deactivated departments disappear from forms but keep their records. Departments cannot be deleted, only merged.</p>
            </div>
          )}
        </aside> : null}
      </div>
    </>
  );
}
