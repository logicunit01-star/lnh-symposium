import "server-only";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db, schema as s } from "./db";
import { getEvent } from "./event";
import { fmtTime24, ymdPk } from "./utils";

/** Venue booking rules for workshop requests (Dashboard Findings, 9 Nov): first come, first served; a room already
 *  booked for an overlapping time (any request that is not rejected) cannot be booked again. */
export const isSunday = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay() === 0;
export const todayPk = () => ymdPk(new Date());
const at = (d: string, hm: string) => new Date(`${d}T${hm}:00+05:00`);
const hm = (d: Date) => fmtTime24(d);

export type Clash = { title: string; from: string; to: string; status: string };
export async function roomClash(venueId: string, startsAt: Date, endsAt: Date, excludeId?: string | null): Promise<Clash | null> {
  const [c] = await db.select({ title: s.sessions.title, a: s.sessions.startsAt, b: s.sessions.endsAt, status: s.sessions.status }).from(s.sessions).where(and(
    eq(s.sessions.venueId, venueId), ne(s.sessions.status, "REJECTED"), sql`${s.sessions.startsAt} < ${endsAt}`, sql`${s.sessions.endsAt} > ${startsAt}`,
    excludeId ? ne(s.sessions.id, excludeId) : undefined));
  return c ? { title: c.title, from: hm(c.a), to: hm(c.b), status: c.status } : null;
}

/** For the form: is the chosen room free, which other rooms are free at that time, and on which dates this room is free at that time. */
/** D1 (13 Nov): a 2- or 3-day workshop runs 09:00-17:00 on consecutive days (no Sunday inside); the room is held for the whole span. */
export const addDays = (ymd: string, n: number) => new Date(new Date(`${ymd}T12:00:00Z`).getTime() + n * 864e5).toISOString().slice(0, 10);
export const spanHasSunday = (ymd: string, days: number) => Array.from({ length: days }, (_, i) => addDays(ymd, i)).some(isSunday);
export const FULL_DAY = { start: "09:00", end: "17:00" };

export async function availability(q: { date: string; start: string; end: string; venueId: string | null; excludeId?: string | null; seats?: number; days?: number }) {
  const days = Math.min(3, Math.max(1, q.days ?? 1));
  const ev = await getEvent();
  const span = (d: string) => [at(d, q.start), at(addDays(d, days - 1), q.end)] as const;
  const [startsAt, endsAt] = span(q.date);
  const venues = await db.select({ id: s.venues.id, name: s.venues.name, building: s.venues.building, capacity: s.venues.capacity }).from(s.venues).where(and(eq(s.venues.active, true), ne(s.venues.usage, "SCIENTIFIC"))).orderBy(asc(s.venues.name));
  const busy = await db.select({ venueId: s.sessions.venueId, a: s.sessions.startsAt, b: s.sessions.endsAt }).from(s.sessions).where(and(
    ne(s.sessions.status, "REJECTED"), sql`${s.sessions.venueId} is not null`, q.excludeId ? ne(s.sessions.id, q.excludeId) : undefined));
  const freeAt = (venueId: string, a: Date, b: Date) => !busy.some((x) => x.venueId === venueId && x.a < b && x.b > a);
  const clash = q.venueId ? await roomClash(q.venueId, startsAt, endsAt, q.excludeId) : null;
  const seats = q.seats ?? 1;
  const otherVenues = venues.filter((v) => v.id !== q.venueId && v.capacity >= seats && freeAt(v.id, startsAt, endsAt));
  // other dates in the workshop window (today onwards, no Sundays) when the chosen room is free at the same time
  const from = [todayPk(), ev.workshopStart ? ymdPk(ev.workshopStart) : todayPk()].sort().at(-1)!;
  const to = ev.workshopEnd ? ymdPk(ev.workshopEnd) : from;
  const otherDates: string[] = [];
  if (q.venueId) for (let d = new Date(`${from}T12:00:00Z`); ymdPk(d) <= to && otherDates.length < 8; d = new Date(d.getTime() + 864e5)) {
    const y = d.toISOString().slice(0, 10);
    if (y === q.date || spanHasSunday(y, days) || addDays(y, days - 1) > to) continue;
    if (freeAt(q.venueId, ...span(y))) otherDates.push(y);
  }
  // smallest rooms that still fit the seat cap first
  return { clash, otherVenues: otherVenues.sort((a, b) => a.capacity - b.capacity).slice(0, 8), otherDates };
}
