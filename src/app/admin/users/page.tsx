import Link from "next/link";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { DEPT_ROLE_LABEL, DEPT_ROLE_PERMS, DEPT_ROLES, MIN_STAFF_PASSWORD, PERM_LABEL, ROLE_LABEL, ROLE_PERMS, type DeptRole } from "@/lib/permissions";
import { PageTitle } from "@/components/admin/ui";
import { cn, fmtDateTime } from "@/lib/utils";
import { saveStaff } from "./actions";

export const metadata = { title: "Users & roles" };
export const dynamic = "force-dynamic";

type SP = { q?: string; role?: string; dept?: string; drole?: string; st?: string; u?: string; saved?: string; err?: string };

/** Users & roles (Super Admin), 15 Nov 2026: filters, one login per person with a global role plus department roles, change log. */
export default async function Users({ searchParams: sp }: { searchParams: SP }) {
  const me = await requirePerm("users");
  // filters
  const c: SQL[] = [];
  if (sp.q) c.push(or(ilike(s.users.name, `%${sp.q}%`), ilike(s.users.email, `%${sp.q}%`))!);
  if (sp.role) c.push(eq(s.users.role, sp.role as any));
  if (sp.st === "active") c.push(eq(s.users.active, true)); else if (sp.st === "inactive") c.push(eq(s.users.active, false));
  if (sp.dept || sp.drole) c.push(sql`exists (select 1 from user_departments ud where ud.user_id = ${s.users.id}${sp.dept ? sql` and ud.department = ${sp.dept}` : sql``}${sp.drole ? sql` and ud.role = ${sp.drole}` : sql``})`);
  const [users, links, departments] = await Promise.all([
    db.select().from(s.users).where(c.length ? and(...c) : undefined).orderBy(desc(s.users.active), asc(s.users.name)),
    db.select().from(s.userDepartments).orderBy(asc(s.userDepartments.department)),
    db.select({ name: s.departments.name, active: s.departments.active }).from(s.departments).orderBy(asc(s.departments.name)),
  ]);
  const of = (id: string) => links.filter((l) => l.userId === id);
  const sel = sp.u === "new" ? null : sp.u ? (await db.select().from(s.users).where(eq(s.users.id, sp.u)))[0] ?? null : null;
  const editing = sp.u === "new" || !!sel;
  const log = sel ? await db.select().from(s.staffAudit).where(eq(s.staffAudit.targetId, sel.id)).orderBy(desc(s.staffAudit.createdAt)).limit(15) : [];
  const keep = new URLSearchParams(Object.entries({ q: sp.q, role: sp.role, dept: sp.dept, drole: sp.drole, st: sp.st }).filter(([, v]) => v) as [string, string][]).toString();
  const link = (u: string) => `/admin/users?${keep ? keep + "&" : ""}u=${u}`;
  const deptOptions = departments.filter((d) => d.active);
  const counts = { total: users.length, active: users.filter((u) => u.active).length };

  return (
    <>
      <PageTitle title="Users & roles" sub="Each login has one global role (what it sees across the console) and any number of department roles (Head, Coordinator, Focal person), which apply to that department only."
        actions={<Link href={link("new")} className="a-btn-primary">+ Add user</Link>} />
      {sp.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved.</p>}
      {sp.err && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{sp.err}</p>}

      <form className="a-card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_0.8fr_auto]">
        <input name="q" defaultValue={sp.q} placeholder="Search name or email…" className="a-input" />
        <select name="role" defaultValue={sp.role ?? ""} className="a-input"><option value="">Any global role</option>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select name="dept" defaultValue={sp.dept ?? ""} className="a-input"><option value="">Any department</option>{departments.map((d) => <option key={d.name}>{d.name}</option>)}</select>
        <select name="drole" defaultValue={sp.drole ?? ""} className="a-input"><option value="">Any department role</option>{DEPT_ROLES.map((r) => <option key={r} value={r}>{DEPT_ROLE_LABEL[r]}</option>)}</select>
        <select name="st" defaultValue={sp.st ?? ""} className="a-input"><option value="">Active and inactive</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <button className="a-btn-ghost">Filter</button>
      </form>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="a-card overflow-x-auto">
          <p className="px-5 pt-4 text-xs text-slate-500">{counts.total} login{counts.total === 1 ? "" : "s"} · {counts.active} active</p>
          <table className="a-table mt-2">
            <thead><tr><th>Name</th><th>Global role</th><th>Departments</th><th>Last sign-in</th><th /></tr></thead>
            <tbody>{users.map((u) => (
              <tr key={u.id} className={cn(!u.active && "opacity-50", sel?.id === u.id && "bg-lnh-blue/5")}>
                <td><span className="font-medium">{u.name}</span>{!u.active && <span className="badge ml-2 bg-slate-200 text-slate-600">Inactive</span>}<span className="block text-xs text-slate-500">{u.email}</span></td>
                <td className="text-sm">{ROLE_LABEL[u.role] ?? u.role}</td>
                <td className="text-xs">{of(u.id).map((l) => <span key={l.department} className="mb-1 mr-1 inline-block rounded-full bg-slate-100 px-2 py-0.5">{l.department} · {DEPT_ROLE_LABEL[l.role as DeptRole] ?? l.role}</span>)}{!of(u.id).length && <span className="text-slate-400">—</span>}</td>
                <td className="whitespace-nowrap text-xs text-slate-500">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "never"}</td>
                <td><Link href={link(u.id)} className="text-xs font-semibold text-lnh-blue hover:underline">Edit</Link></td>
              </tr>
            ))}</tbody>
          </table>
          {!users.length && <p className="p-6 text-center text-sm text-slate-400">No login matches these filters.</p>}
        </div>

        <aside className="space-y-4">
          {editing ? (
            <>
              {/* key: a fresh form after every save, so a typed password never stays in the page */}
              <form key={`${sel?.id ?? "new"}-${sp.saved ?? ""}-${sp.err ?? ""}`} action={saveStaff.bind(null, sel?.id ?? null)} className="a-card space-y-3 p-5" autoComplete="off">
                <h2 className="font-display text-base font-bold">{sel ? `Edit ${sel.name}` : "New login"}</h2>
                <div><label className="a-label">Name</label><input name="name" required defaultValue={sel?.name ?? ""} className="a-input" /></div>
                <div><label className="a-label">Email (username)</label><input name="email" type="email" required defaultValue={sel?.email ?? ""} className="a-input" /></div>
                <div><label className="a-label">Global role</label>
                  <select name="role" defaultValue={sel?.role ?? "DEPARTMENT"} disabled={sel?.id === me.sub} className="a-input">{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  {sel?.id === me.sub && <><input type="hidden" name="role" value={sel.role} /><p className="mt-1 text-xs text-slate-500">You cannot change your own role.</p></>}</div>
                <fieldset className="rounded-lg border border-slate-200 p-3">
                  <legend className="px-1 text-xs font-semibold text-slate-600">Department roles</legend>
                  {sel && of(sel.id).map((l) => (
                    <div key={l.department} className="mb-2 grid grid-cols-[1fr_150px] items-center gap-2 text-sm">
                      <span className="truncate">{l.department}</span>
                      <select name={`dr_${l.department}`} defaultValue={l.role} className="a-input py-1.5">{DEPT_ROLES.map((r) => <option key={r} value={r}>{DEPT_ROLE_LABEL[r]}</option>)}<option value="REMOVE">Remove</option></select>
                    </div>
                  ))}
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="mb-2 grid grid-cols-[1fr_150px] gap-2">
                      <select name={`new_dept_${i}`} defaultValue="" className="a-input py-1.5 text-sm"><option value="">{i === 0 ? "Add a department…" : "…another department"}</option>{deptOptions.map((d) => <option key={d.name}>{d.name}</option>)}</select>
                      <select name={`new_role_${i}`} defaultValue="" className="a-input py-1.5 text-sm"><option value="">Role…</option>{DEPT_ROLES.map((r) => <option key={r} value={r}>{DEPT_ROLE_LABEL[r]}</option>)}</select>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">One role per department. One active focal person per department.</p>
                </fieldset>
                <div><label className="a-label">{sel ? "New password (leave blank to keep)" : "Password"}</label>
                  <input name="password" type="password" minLength={MIN_STAFF_PASSWORD} autoComplete="new-password" placeholder={`at least ${MIN_STAFF_PASSWORD} characters`} className="a-input" />
                  {sel && sel.id !== me.sub && <p className="mt-1 text-xs text-slate-500">A new password signs this person out everywhere.</p>}</div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={sel?.active ?? true} disabled={sel?.id === me.sub} />Active (can sign in)</label>
                {sel?.id === me.sub && <input type="hidden" name="active" value="on" />}
                <div className="flex gap-2"><button className="a-btn-primary">{sel ? "Save" : "Create login"}</button><Link href={`/admin/users${keep ? `?${keep}` : ""}`} className="a-btn-ghost">Close</Link></div>
                {sel && <p className="text-xs text-slate-500">Created {fmtDateTime(sel.createdAt)} · last sign-in {sel.lastLoginAt ? fmtDateTime(sel.lastLoginAt) : "never"}</p>}
              </form>
              {sel && (
                <div className="a-card p-5">
                  <h2 className="font-display text-base font-bold">Change log</h2>
                  {log.length ? <ul className="mt-2 space-y-2 text-xs">{log.map((l) => <li key={l.id}><span className="text-slate-500">{fmtDateTime(l.createdAt)} · {l.actor}</span><br />{l.action}{l.detail ? `: ${l.detail}` : ""}</li>)}</ul>
                    : <p className="mt-2 text-xs text-slate-400">No changes recorded yet.</p>}
                </div>
              )}
            </>
          ) : (
            <div className="a-card p-5 text-sm text-slate-600">Choose a login to edit, or add one. Department staff (Heads, coordinators, focal persons) get the global role “Department staff only” plus their department roles.</div>
          )}
        </aside>
      </div>

      <h2 className="mt-8 font-display text-lg font-bold">What each role can do</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DEPT_ROLES.map((r) => (
          <div key={r} className="a-card border-lnh-blue/30 p-4"><p className="text-sm font-semibold">{DEPT_ROLE_LABEL[r]} <span className="text-xs font-normal text-slate-500">(department role)</span></p>
            <ul className="mt-1 list-disc pl-4 text-xs text-slate-500">{DEPT_ROLE_PERMS[r].map((p) => <li key={p}>{PERM_LABEL[p]}</li>)}</ul></div>
        ))}
        {Object.entries(ROLE_PERMS).map(([r, p]) => (
          <div key={r} className="a-card p-4"><p className="text-sm font-semibold">{ROLE_LABEL[r]}</p>
            {p.length ? <ul className="mt-1 list-disc pl-4 text-xs text-slate-500">{p.map((x) => <li key={x}>{PERM_LABEL[x]}</li>)}</ul> : <p className="mt-1 text-xs text-slate-500">Nothing on its own; access comes from department roles.</p>}</div>
        ))}
      </div>
    </>
  );
}
