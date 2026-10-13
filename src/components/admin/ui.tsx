import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageTitle({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="font-display text-2xl font-bold text-slate-900">{title}</h1>{sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
export function Stat({ label, value, sub, accent = "blue" }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: "blue" | "red" | "green" | "amber" }) {
  const c = { blue: "bg-lnh-blue", red: "bg-lnh-red", green: "bg-emerald-500", amber: "bg-amber-500" }[accent];
  return (
    <div className="a-card relative overflow-hidden p-5">
      <span className={cn("absolute left-0 top-0 h-full w-1", c)} />
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
const STATUS: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700", WAIVED: "bg-sky-100 text-sky-700", PENDING: "bg-amber-100 text-amber-700", FAILED: "bg-rose-100 text-rose-700", REFUNDED: "bg-slate-200 text-slate-700",
  SUBMITTED: "bg-slate-200 text-slate-700", UNDER_REVIEW: "bg-sky-100 text-sky-700", ACCEPTED: "bg-emerald-100 text-emerald-700", REJECTED: "bg-rose-100 text-rose-700", REVISION: "bg-amber-100 text-amber-700",
  SENT: "bg-emerald-100 text-emerald-700", LOGGED: "bg-slate-200 text-slate-700",
};
export const StatusBadge = ({ s }: { s: string }) => <span className={cn("badge", STATUS[s] ?? "bg-slate-100 text-slate-600")}>{s.replace("_", " ")}</span>;

export function Bars({ data, height = 160, color = "#1560D4" }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="group relative flex h-full flex-1 flex-col justify-end">
          <div className="rounded-t" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0, background: color }} />
          <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">{d.label}: {d.value}</span>
        </div>
      ))}
    </div>
  );
}
export function Meter({ value, max, className }: { value: number; max: number | null; className?: string }) {
  if (!max) return <span className="text-xs text-slate-400">{value} / ∞</span>;
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={cn("min-w-[110px]", className)}>
      <div className="flex justify-between text-xs"><span className="font-semibold text-slate-700">{value}/{max}</span><span className="text-slate-400">{Math.round(pct)}%</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className={cn("h-full rounded-full", pct >= 100 ? "bg-lnh-red" : pct > 80 ? "bg-amber-500" : "bg-lnh-blue")} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
export function Pager({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const href = (p: number) => `${base}${base.includes("?") ? "&" : "?"}page=${p}`;
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-slate-500">Page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link className="a-btn-ghost" href={href(page - 1)}>Previous</Link>}
        {page < pages && <Link className="a-btn-ghost" href={href(page + 1)}>Next</Link>}
      </div>
    </div>
  );
}
export const Empty = ({ children }: { children: React.ReactNode }) => <div className="px-4 py-12 text-center text-sm text-slate-400">{children}</div>;
