// Workshop Programme (WP) committee: data for the console, approvals, daily sheet and alerts.
import "server-only";
import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db, schema as s } from "./db";
import { ymdPk, fmtTime24 } from "./utils";

export const WP_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"] as const;
export const CATEGORY_LABEL: Record<string, string> = { A: "A · Multidisciplinary", B: "B · Departmental" };
export const TIER_LABEL: Record<string, string> = { STUDENT: "Students", EMPLOYEE: "LNH employees", GENERAL: "General visitors", FOREIGN: "Foreign delegates" };
export const DECISION_LABEL: Record<string, string> = { RUN: "Run as planned", MERGE: "Merge", CANCEL: "Cancel", PROMOTE: "Extend marketing push" };
/** Below this fill, 7 days before the date, the Co-Chairs must decide. */
export const LOW_FILL = 0.4;
export const DECISION_DAYS = 7;

export type Scope = { all: boolean; department: string | null };
const scopeWhere = (sc: Scope): SQL | undefined => (sc.all ? undefined : eq(s.sessions.department, sc.department ?? "__none__"));

const ACTIVE = sql`r.payment_status in ('PENDING','PAID','WAIVED')`;

/** All workshop rows (any status) with booking counts. */
export async function wpWorkshops(sc: Scope, f: { status?: string; week?: number; dept?: string } = {}) {
  const conds = [eq(s.sessions.type, "WORKSHOP"), scopeWhere(sc)];
  if (f.status) conds.push(eq(s.sessions.status, f.status));
  if (f.week) conds.push(eq(s.sessions.themeWeek, f.week));
  if (f.dept) conds.push(eq(s.sessions.department, f.dept));
  const rows = await db.select({
    w: s.sessions,
    venue: s.venues,
    booked: sql<number>`(select count(*) from registration_items ri join registrations r on r.id = ri.registration_id where ri.session_id = sessions.id and ${ACTIVE})::int`,
    confirmed: sql<number>`(select count(*) from registration_items ri join registrations r on r.id = ri.registration_id where ri.session_id = sessions.id and r.payment_status in ('PAID','WAIVED'))::int`,
    attended: sql<number>`(select count(*) from registration_items ri where ri.session_id = sessions.id and ri.attended_at is not null)::int`,
    waiting: sql<number>`(select count(*) from waitlist wl where wl.session_id = sessions.id)::int`,
    income: sql<number>`(select coalesce(sum(ri.fee),0) from registration_items ri join registrations r on r.id = ri.registration_id where ri.session_id = sessions.id and r.payment_status = 'PAID')::int`,
  }).from(s.sessions).leftJoin(s.venues, eq(s.venues.id, s.sessions.venueId))
    .where(and(...conds.filter(Boolean) as SQL[])).orderBy(asc(s.sessions.startsAt));
  // Clash detection: same venue, same day, overlapping time (ignoring rejected).
  const live = rows.filter((r) => r.w.status !== "REJECTED");
  return rows.map((r) => ({
    ...r,
    date: ymdPk(r.w.startsAt), time: `${fmtTime24(r.w.startsAt)}–${fmtTime24(r.w.endsAt)}`,
    fill: r.w.capacity ? r.booked / r.w.capacity : 0,
    clash: r.w.status !== "REJECTED" && live.some((o) => o.w.id !== r.w.id && (o.w.venueId ?? o.w.hall) === (r.w.venueId ?? r.w.hall) && o.w.startsAt < r.w.endsAt && r.w.startsAt < o.w.endsAt),
  }));
}
export type WpRow = Awaited<ReturnType<typeof wpWorkshops>>[number];

/** Approved workshops under 40% with the decision point (date − 7 days) reached. */
export function lowFillAlerts(rows: WpRow[], asOf: Date) {
  const ms = DECISION_DAYS * 864e5;
  return rows.filter((r) => r.w.status === "APPROVED" && r.w.capacity && r.fill < LOW_FILL
    && r.w.startsAt.getTime() > asOf.getTime() && r.w.startsAt.getTime() - asOf.getTime() <= ms);
}
/** Approved workshops under 40% whose decision point is still ahead (watch list). */
export function lowFillWatch(rows: WpRow[], asOf: Date) {
  const ms = DECISION_DAYS * 864e5;
  return rows.filter((r) => r.w.status === "APPROVED" && r.w.capacity && r.fill < LOW_FILL && r.w.startsAt.getTime() - asOf.getTime() > ms);
}

export function wpKpis(rows: WpRow[], seatTarget: number) {
  const approved = rows.filter((r) => r.w.status === "APPROVED");
  const cap = approved.reduce((a, r) => a + (r.w.capacity ?? 0), 0);
  const booked = approved.reduce((a, r) => a + r.booked, 0);
  const confirmed = approved.reduce((a, r) => a + r.confirmed, 0);
  const byDept = new Map<string, { cap: number; booked: number; n: number }>();
  for (const r of approved) {
    const k = r.w.department ?? "Other"; const v = byDept.get(k) ?? { cap: 0, booked: 0, n: 0 };
    v.cap += r.w.capacity ?? 0; v.booked += r.booked; v.n++; byDept.set(k, v);
  }
  return {
    approved: approved.length, cap, booked, confirmed, seatTarget,
    waiting: rows.reduce((a, r) => a + r.waiting, 0),
    income: rows.reduce((a, r) => a + r.income, 0),
    pendingNew: rows.filter((r) => r.w.status === "SUBMITTED").length,
    pendingRevision: rows.filter((r) => r.w.status === "UNDER_REVIEW").length,
    rejected: rows.filter((r) => r.w.status === "REJECTED").length,
    clashes: rows.filter((r) => r.clash).length,
    byDept: [...byDept.entries()].map(([dept, v]) => ({ dept, ...v, pct: v.cap ? v.booked / v.cap : 0 })).sort((a, b) => b.pct - a.pct),
  };
}

/** Paid income split by registrant tier (Student / Employee / General / Foreign). */
export async function revenueByTier(sc: Scope) {
  const deptFilter = sc.all ? sql`true` : sql`exists (select 1 from registration_items ri join sessions se on se.id = ri.session_id where ri.registration_id = r.id and se.department = ${sc.department})`;
  const res = await db.execute(sql`
    select fc.tier as tier, count(r.id)::int as n, coalesce(sum(r.total_fee),0)::int as amount
    from fee_category fc left join registrations r on r.category_id = fc.id and r.payment_status = 'PAID' and ${deptFilter}
    group by fc.tier`);
  const rows = ((res as any).rows ?? res) as { tier: string; n: number; amount: number }[];
  const order = ["STUDENT", "EMPLOYEE", "GENERAL", "FOREIGN"];
  const total = rows.reduce((a, r) => a + Number(r.amount), 0);
  return order.map((t) => {
    const r = rows.find((x) => x.tier === t);
    const amount = Number(r?.amount ?? 0);
    return { tier: t, label: TIER_LABEL[t], n: Number(r?.n ?? 0), amount, pct: total ? amount / total : 0 };
  });
}

/** Everything the Duty Officer needs for one day. */
export async function dailySheet(date: string, sc: Scope) {
  const rows = (await wpWorkshops(sc, { status: "APPROVED" })).filter((r) => r.date === date);
  const staff = rows.reduce((a, r) => ({ fac: a.fac + r.w.facilitators, vol: a.vol + r.w.volunteers, tech: a.tech + r.w.technicians }), { fac: 0, vol: 0, tech: 0 });
  const eq = new Map<string, { item: string; source: string; qty: number; for: string[] }>();
  for (const r of rows) for (const e of r.w.equipment ?? []) {
    const k = `${e.item.toLowerCase()}|${e.source.toLowerCase()}`;
    const v = eq.get(k) ?? { item: e.item, source: e.source, qty: 0, for: [] };
    v.qty += Number(e.qty) || 0; v.for.push(r.w.title); eq.set(k, v);
  }
  return { rows, staff, equipment: [...eq.values()].sort((a, b) => a.source.localeCompare(b.source)), seats: rows.reduce((a, r) => a + r.booked, 0) };
}

/** Distinct dates with approved workshops (for the daily sheet picker). */
export async function workshopDates(sc: Scope) {
  const rows = await db.select({ d: s.sessions.startsAt }).from(s.sessions)
    .where(and(eq(s.sessions.type, "WORKSHOP"), eq(s.sessions.status, "APPROVED"), scopeWhere(sc)));
  return [...new Set(rows.map((r) => ymdPk(r.d)))].sort();
}

export async function departments() {
  const rows = await db.selectDistinct({ d: s.sessions.department }).from(s.sessions)
    .where(and(eq(s.sessions.type, "WORKSHOP"), inArray(s.sessions.status, [...WP_STATUSES])));
  return rows.map((r) => r.d).filter(Boolean).sort() as string[];
}
