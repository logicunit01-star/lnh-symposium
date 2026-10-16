import Link from "next/link";
import { cn } from "@/lib/utils";

const PILL: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700 ring-blue-200",
  UNDER_REVIEW: "bg-orange-100 text-orange-700 ring-orange-200",
  APPROVED: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-100 text-rose-700 ring-rose-200",
};
export const WpStatus = ({ s, locked }: { s: string; locked?: boolean }) => (
  <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1", PILL[s] ?? "bg-slate-100 text-slate-600 ring-slate-200")}>
    {s.replace("_", " ")}{locked && <svg viewBox="0 0 16 16" className="h-3 w-3" aria-label="locked"><path fill="currentColor" d="M4 7V5a4 4 0 1 1 8 0v2h1v8H3V7h1Zm2 0h4V5a2 2 0 1 0-4 0v2Z" /></svg>}
  </span>
);

export function WpTabs({ active, pending, canSubmit, canVenues, canCheckin }: { active: string; pending: number; canSubmit: boolean; canVenues: boolean; canCheckin: boolean }) {
  const tabs = [
    { k: "dash", href: "/admin/workshops", label: "Dashboard" },
    { k: "approvals", href: "/admin/workshops/approvals", label: `Approvals${pending ? ` (${pending})` : ""}` },
    { k: "daily", href: "/admin/workshops/daily", label: "Daily requirements" },
    ...(canCheckin ? [{ k: "checkin", href: "/admin/checkin", label: "Check-in" }] : []),
    ...(canVenues ? [{ k: "venues", href: "/admin/venues", label: "Venues & map" }] : []),
  ];
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <nav className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1" aria-label="Workshop programme">
        {tabs.map((t) => (
          <Link key={t.k} href={t.href} aria-current={active === t.k ? "page" : undefined}
            className={cn("whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition", active === t.k ? "bg-white text-lnh-navy shadow-sm" : "text-slate-500 hover:text-slate-800")}>{t.label}</Link>
        ))}
      </nav>
      {canSubmit && <Link href="/admin/workshops/new" className="a-btn-red">+ New workshop request</Link>}
    </div>
  );
}

export function Bar({ pct, tone = "blue" }: { pct: number; tone?: "blue" | "amber" | "red" | "green" }) {
  const c = { blue: "bg-lnh-blue", amber: "bg-amber-500", red: "bg-lnh-red", green: "bg-emerald-500" }[tone];
  return <div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className={cn("h-full rounded-full", c)} style={{ width: `${Math.min(100, Math.max(0, pct * 100))}%` }} /></div>;
}
export const pct = (x: number) => `${Math.round(x * 100)}%`;
export const usd = (pkrAmount: number, rate: number) => `USD ${(pkrAmount / (rate || 280)).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
