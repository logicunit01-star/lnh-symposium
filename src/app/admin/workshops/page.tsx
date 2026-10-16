import Link from "next/link";
import { AlertTriangle, CalendarClock, Hourglass, Layers, Ticket, Wallet } from "lucide-react";
import { requirePerm, staffScope } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getEvent } from "@/lib/event";
import { CATEGORY_LABEL, DECISION_DAYS, DECISION_LABEL, LOW_FILL, departments, lowFillAlerts, lowFillWatch, revenueByTier, wpKpis, wpWorkshops, WP_STATUSES } from "@/lib/wp";
import { PageTitle } from "@/components/admin/ui";
import { Bar, WpStatus, WpTabs, pct, usd } from "@/components/admin/wp";
import { cn, fmtDate, pkr } from "@/lib/utils";
import { decideLowFill } from "./actions";

export const metadata = { title: "Workshop Programme" };

export default async function WorkshopConsole({ searchParams }: { searchParams: { status?: string; week?: string; dept?: string; asOf?: string; denied?: string; deleted?: string } }) {
  const u = await requirePerm("workshops");
  const sc = await staffScope(u);
  const ev = await getEvent();
  const asOf = searchParams.asOf && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.asOf) ? new Date(`${searchParams.asOf}T09:00:00+05:00`) : new Date();
  const status = WP_STATUSES.includes(searchParams.status as any) ? searchParams.status : undefined;
  const week = Number(searchParams.week) || undefined;
  const dept = sc.all ? searchParams.dept || undefined : undefined;

  const [all, tiers, depts] = await Promise.all([wpWorkshops(sc), revenueByTier(sc), sc.all ? departments() : Promise.resolve([])]);
  const rows = all.filter((r) => (!status || r.w.status === status) && (!week || r.w.themeWeek === week) && (!dept || r.w.department === dept));
  const k = wpKpis(all, ev.seatTarget);
  const alerts = lowFillAlerts(all, asOf);
  const watch = lowFillWatch(all, asOf);
  const tierTotal = tiers.reduce((a, t) => a + t.amount, 0);
  const canReview = can(u.role, "workshops.review");
  const canEdit = (r: (typeof rows)[number]) => !r.w.locked && (can(u.role, "workshops.edit") || (!sc.all && can(u.role, "workshops.submit")));
  const q = (o: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const m = { status, week, dept, asOf: searchParams.asOf, ...o };
    Object.entries(m).forEach(([a, b]) => b != null && b !== "" && p.set(a, String(b)));
    const sq = p.toString(); return `/admin/workshops${sq ? `?${sq}` : ""}`;
  };

  return (
    <>
      <PageTitle title="Workshop Programme"
        sub={sc.all ? "Committee console: registrations, capacity, income and the approval queue for the pre-symposium workshops. Updates live as people register."
          : `Department view: ${sc.department === "__none__" ? "no department set on your user — ask the Super Admin" : sc.department}. You see only your department's workshops.`} />
      <WpTabs active="dash" pending={k.pendingNew + k.pendingRevision} canSubmit={can(u.role, "workshops.submit")} canVenues={can(u.role, "venues")} canCheckin={can(u.role, "checkin")} />
      {searchParams.denied && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">You don’t have access to that section.</p>}
      {searchParams.deleted && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Request withdrawn.</p>}

      {alerts.length > 0 && (
        <div role="alert" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-5 w-5 text-amber-600" />{alerts.length} workshop{alerts.length > 1 ? "s are" : " is"} under {pct(LOW_FILL)} full with {DECISION_DAYS} days or less to go. Co-Chairs: run, merge, cancel or extend the marketing push.</p>
          <ul className="mt-3 space-y-2">
            {alerts.map((r) => (
              <li key={r.w.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-white/70 px-3 py-2 text-sm">
                <Link href={`/admin/workshops/${r.w.id}`} className="font-semibold hover:underline">{r.w.title}</Link>
                <span className="text-amber-800">{fmtDate(r.w.startsAt, { day: "numeric", month: "short" })} · {r.booked}/{r.w.capacity} ({pct(r.fill)})</span>
                {r.w.coChairDecision ? <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold">Decided: {DECISION_LABEL[r.w.coChairDecision]}</span>
                  : canReview && (
                    <form action={decideLowFill.bind(null, r.w.id)} className="ml-auto flex gap-1">
                      {Object.entries(DECISION_LABEL).map(([v, l]) => <button key={v} name="decision" value={v} className={cn("rounded-md px-2 py-1 text-xs font-semibold", v === "CANCEL" ? "bg-rose-600 text-white" : "bg-amber-600/90 text-white")}>{l}</button>)}
                    </form>
                  )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI telemetry */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="a-card p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Ticket className="h-4 w-4 text-lnh-blue" />Workshop registrations</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900">{k.booked.toLocaleString()}<span className="text-base font-medium text-slate-400"> / {k.seatTarget.toLocaleString()}</span></p>
          <div className="mt-2"><Bar pct={k.booked / (k.seatTarget || 1)} /></div>
          <p className="mt-1.5 text-xs text-slate-500">{pct(k.booked / (k.seatTarget || 1))} of seat target · {k.confirmed} paid</p>
        </div>
        <div className="a-card p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Layers className="h-4 w-4 text-lnh-blue" />Overall capacity fill</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900">{pct(k.cap ? k.booked / k.cap : 0)}</p>
          <p className="text-xs text-slate-500">{k.booked} of {k.cap} seats in {k.approved} approved workshops</p>
          <div className="mt-2 flex flex-wrap gap-1">{k.byDept.slice(0, 4).map((d) => <span key={d.dept} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{d.dept} [{pct(d.pct)}]</span>)}</div>
        </div>
        <div className="a-card p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Hourglass className="h-4 w-4 text-orange-500" />Evaluation queue</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900">{k.pendingNew + k.pendingRevision}<span className="text-base font-medium text-slate-400"> pending</span></p>
          <p className="mt-1 text-xs"><span className="rounded bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-700">{k.pendingNew} new</span> <span className="rounded bg-orange-100 px-1.5 py-0.5 font-semibold text-orange-700">{k.pendingRevision} under review</span></p>
          {k.clashes > 0 && <p className="mt-2 text-xs font-semibold text-rose-600">{k.clashes} venue/time clash{k.clashes > 1 ? "es" : ""} to resolve</p>}
        </div>
        <div className="a-card p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Wallet className="h-4 w-4 text-emerald-600" />Workshop income</p>
          <p className="mt-2 font-display text-3xl font-bold text-slate-900">{pkr(k.income)}</p>
          <p className="text-xs text-slate-500">≈ {usd(k.income, ev.usdRate)} · {k.waiting} on waitlists</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="a-card p-5">
          <div className="flex items-baseline justify-between"><h2 className="font-display text-base font-bold">Revenue by registrant type</h2><p className="text-xs text-slate-500">Paid registrations · {pkr(tierTotal)} · 1 USD = {ev.usdRate} PKR</p></div>
          <ul className="mt-4 space-y-3">
            {tiers.map((t, i) => (
              <li key={t.tier}>
                <div className="flex justify-between text-sm"><span className="font-medium text-slate-700">{t.label} <span className="text-xs text-slate-400">({t.n})</span></span><span className="font-mono text-xs text-slate-600">{pkr(t.amount)} · {usd(t.amount, ev.usdRate)} · <b>{pct(t.pct)}</b></span></div>
                <div className="mt-1"><Bar pct={t.pct} tone={(["green", "blue", "amber", "red"] as const)[i]} /></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="a-card p-5">
          <h2 className="font-display text-base font-bold">Fill by department</h2>
          <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
            {k.byDept.map((d) => (
              <li key={d.dept} className="text-sm"><div className="flex justify-between"><span className="text-slate-700">{d.dept} <span className="text-xs text-slate-400">· {d.n}</span></span><span className="font-mono text-xs">{d.booked}/{d.cap} · {pct(d.pct)}</span></div>
                <div className="mt-1"><Bar pct={d.pct} tone={d.pct < LOW_FILL ? "amber" : "blue"} /></div></li>
            ))}
            {!k.byDept.length && <li className="text-sm text-slate-400">No approved workshops yet.</li>}
          </ul>
        </div>
      </div>

      {/* Programme matrix */}
      <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">Programme tracking matrix</h2>
          <p className="text-sm text-slate-500">Date and time first so overlaps stand out. Rows with a red edge clash with another workshop in the same venue.</p>
        </div>
        <form className="flex flex-wrap items-end gap-2" action="/admin/workshops">
          {status && <input type="hidden" name="status" value={status} />}
          <div><label className="a-label">Theme week</label><select name="week" defaultValue={week ?? ""} className="a-input py-1.5"><option value="">All weeks</option>{ev.themeWeeks.map((w, i) => <option key={i} value={i + 1}>Week {i + 1} · {w.label}</option>)}</select></div>
          {sc.all && <div><label className="a-label">Department</label><select name="dept" defaultValue={dept ?? ""} className="a-input py-1.5"><option value="">All</option>{depts.map((d) => <option key={d}>{d}</option>)}</select></div>}
          <div><label className="a-label" title="Preview alerts as they would appear on this date">Simulate date</label><input type="date" name="asOf" defaultValue={searchParams.asOf ?? ""} className="a-input py-1.5" /></div>
          <button className="a-btn-ghost">Apply</button>
        </form>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[undefined, ...WP_STATUSES].map((st) => {
          const n = st ? all.filter((r) => r.w.status === st).length : all.length;
          return <Link key={st ?? "all"} href={q({ status: st ?? "" })} className={cn("rounded-full px-3 py-1 text-xs font-semibold ring-1", status === st ? "bg-lnh-navy text-white ring-lnh-navy" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-400")}>{st ? st.replace("_", " ") : "All"} · {n}</Link>;
        })}
      </div>
      <div className="a-card mt-3 overflow-x-auto">
        <table className="a-table">
          <thead><tr><th>Workshop</th><th>Proposed date</th><th>Time (24h)</th><th>Venue</th><th>Registered</th><th>Cap</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.w.id} className={cn(r.clash && "[&>td:first-child]:border-l-4 [&>td:first-child]:border-l-lnh-red")}>
                <td className="min-w-[240px]"><Link href={`/admin/workshops/${r.w.id}`} className="font-medium text-slate-800 hover:text-lnh-blue">{r.w.title}</Link>
                  <p className="text-xs text-slate-400">{r.w.department}{r.w.category ? ` · ${CATEGORY_LABEL[r.w.category]}` : ""}{r.w.themeWeek ? ` · Week ${r.w.themeWeek}` : ""}{r.clash ? " · " : ""}{r.clash && <b className="text-lnh-red">clash</b>}</p></td>
                <td className="whitespace-nowrap font-mono text-xs">{fmtDate(r.w.startsAt, { day: "2-digit", month: "short", year: "numeric" })}</td>
                <td className="whitespace-nowrap font-mono text-xs">{r.time}</td>
                <td className="whitespace-nowrap text-xs">{r.venue?.name ?? r.w.hall ?? "—"}</td>
                <td className="min-w-[110px]"><span className="font-semibold">{r.booked}</span>{r.waiting > 0 && <span className="text-xs text-slate-400"> +{r.waiting} wait</span>}
                  {r.w.status === "APPROVED" && r.w.capacity ? <div className="mt-1"><Bar pct={r.fill} tone={r.fill >= 1 ? "red" : r.fill < LOW_FILL ? "amber" : "blue"} /></div> : null}</td>
                <td className="text-sm">{r.w.capacity ?? "—"}</td>
                <td><WpStatus s={r.w.status} locked={r.w.locked} /></td>
                <td className="whitespace-nowrap text-right text-xs font-semibold">
                  <Link href={`/admin/workshops/${r.w.id}`} className="text-lnh-blue hover:underline">View</Link>
                  {canEdit(r) && <> · <Link href={`/admin/workshops/${r.w.id}/edit`} className="text-lnh-blue hover:underline">Edit</Link></>}
                  {(canReview || can(u.role, "workshops.edit")) && !r.w.locked && <> · <Link href={`/admin/workshops/${r.w.id}#review`} className="text-lnh-red hover:underline">Action</Link></>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">No workshops match. {can(u.role, "workshops.submit") && <Link href="/admin/workshops/new" className="text-lnh-blue underline">Submit a request</Link>}</td></tr>}
          </tbody>
        </table>
      </div>

      {watch.length > 0 && (
        <div className="a-card mt-6 p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-bold"><CalendarClock className="h-4 w-4 text-amber-500" />Watch list: under {pct(LOW_FILL)} full</h2>
          <p className="text-xs text-slate-500">The amber alert fires {DECISION_DAYS} days before each date. Decision dates below.</p>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {watch.map((r) => (
              <li key={r.w.id} className="flex flex-wrap justify-between gap-2 py-2">
                <Link href={`/admin/workshops/${r.w.id}`} className="font-medium hover:text-lnh-blue">{r.w.title}</Link>
                <span className="font-mono text-xs text-slate-500">{r.booked}/{r.w.capacity} ({pct(r.fill)}) · decide by {fmtDate(new Date(r.w.startsAt.getTime() - DECISION_DAYS * 864e5), { day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
