import { switchDept } from "@/app/admin/dept/switch-action";

/** Shown on department pages when the signed-in person belongs to more than one department. */
export function DeptSwitcher({ list, current, back }: { list: string[]; current: string | null; back: string }) {
  if (list.length < 2) return null;
  return (
    <form action={switchDept} className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-lnh-blue/5 px-4 py-2.5 text-sm">
      <input type="hidden" name="back" value={back} />
      <span className="font-semibold text-slate-700">Working on department:</span>
      <select name="dept" defaultValue={current ?? ""} className="a-input w-auto py-1.5">{list.map((d) => <option key={d}>{d}</option>)}</select>
      <button className="a-btn-ghost py-1.5 text-xs">Switch</button>
    </form>
  );
}
