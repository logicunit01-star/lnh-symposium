"use client";
import { useFormState, useFormStatus } from "react-dom";
import { issueDeptLogins, type CredResult } from "@/app/admin/departments/actions";

function Btn({ children, ghost }: { children: React.ReactNode; ghost?: boolean }) { const { pending } = useFormStatus(); return <button disabled={pending} className={ghost ? "text-xs font-semibold text-lnh-blue hover:underline" : "a-btn-primary"}>{pending ? "Working…" : children}</button>; }

/** "Create missing logins" button + one-time credentials table (with CSV download). */
export function DeptLoginsPanel() {
  const [state, action] = useFormState<CredResult, FormData>(issueDeptLogins, null);
  const csv = state?.creds ? "Department,Username,Passcode\n" + state.creds.map((c) => `"${c.dept}",${c.email},${c.passcode}`).join("\n") : "";
  return (
    <div className="a-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold">Department logins</p><p className="text-sm text-slate-500">One login per speciality, used for abstract review, the scientific session agenda and workshop requests. Passcodes are shown once.</p></div>
        <form action={action}><Btn>Create missing logins</Btn></form>
      </div>
      {state?.error && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{state.error}</p>}
      {state?.creds && (
        <div className="mt-4">
          <p className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">Copy or download these now; they will not be shown again. Share each passcode only with that department.</p>
          <a download="department-logins.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} className="a-btn-ghost mb-2">Download CSV</a>
          <table className="a-table"><thead><tr><th>Department</th><th>Username</th><th>Passcode</th></tr></thead>
            <tbody>{state.creds.map((c) => <tr key={c.dept}><td>{c.dept}</td><td className="font-mono text-xs">{c.email}</td><td className="font-mono text-xs">{c.passcode}</td></tr>)}</tbody></table>
        </div>
      )}
    </div>
  );
}

export function ResetLogin({ dept }: { dept: string }) {
  const [state, action] = useFormState<CredResult, FormData>(issueDeptLogins, null);
  const c = state?.creds?.[0];
  return c ? <span className="font-mono text-[11px] text-rose-700">{c.passcode}</span> : (
    <form action={action}><input type="hidden" name="dept" value={dept} /><Btn ghost>Reset passcode</Btn></form>
  );
}
