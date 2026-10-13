import { asc } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { ROLE_LABEL, ROLE_PERMS } from "@/lib/permissions";
import { PageTitle } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/utils";
import { saveUser } from "../actions";

export default async function Users() {
  await requirePerm("users");
  const users = await db.select().from(s.users).orderBy(asc(s.users.createdAt));
  return (
    <>
      <PageTitle title="Users & roles" sub="Role-based access: each role only sees the sections it needs." />
      <div className="a-card overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>New password</th><th>Active</th><th>Last login</th><th /></tr></thead>
          <tbody>{[...users, null].map((u) => {
            const id = u ? `u_${u.id}` : "u_new";
            return (
              <tr key={id}>
                <td><input form={id} name="name" required defaultValue={u?.name ?? ""} placeholder={u ? "" : "New user…"} className="a-input" /></td>
                <td><input form={id} name="email" type="email" required defaultValue={u?.email ?? ""} className="a-input" /></td>
                <td><select form={id} name="role" defaultValue={u?.role ?? "VIEWER"} className="a-input">{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                <td><input form={id} name="password" type="password" placeholder={u ? "unchanged" : "min 8 chars"} className="a-input" autoComplete="new-password" /></td>
                <td><input form={id} name="active" type="checkbox" defaultChecked={u?.active ?? true} /></td>
                <td className="whitespace-nowrap text-xs text-slate-500">{u?.lastLoginAt ? fmtDateTime(u.lastLoginAt) : "—"}</td>
                <td><form id={id} action={saveUser.bind(null, u?.id ?? null)}><button className="a-btn-primary py-1.5 text-xs">{u ? "Save" : "Add"}</button></form></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(ROLE_PERMS).map(([r, p]) => (
          <div key={r} className="a-card p-4"><p className="text-sm font-semibold">{ROLE_LABEL[r]}</p><p className="mt-1 text-xs text-slate-500">{p.join(", ")}</p></div>
        ))}
      </div>
    </>
  );
}
