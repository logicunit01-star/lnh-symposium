import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema as s } from "./db";

export const getEvent = cache(async () => {
  const [e] = await db.select().from(s.event).where(eq(s.event.id, 1));
  if (!e) throw new Error("Event settings missing — run `npm run db:seed`.");
  return e;
});
export const getFeeCategories = cache(async () =>
  db.select().from(s.feeCategory).where(eq(s.feeCategory.active, true)).orderBy(asc(s.feeCategory.order)));

export const isEarlyBird = (e: { earlyBirdUntil: Date | null }, now = new Date()) => !!e.earlyBirdUntil && now <= e.earlyBirdUntil;
export const abstractWindow = (e: { abstractOpen: Date | null; abstractDeadline: Date | null }, now = new Date()) => {
  if (e.abstractOpen && now < e.abstractOpen) return "NOT_OPEN" as const;
  if (e.abstractDeadline && now > e.abstractDeadline) return "CLOSED" as const;
  return "OPEN" as const;
};
/** Edition year shown in branding, e.g. "2027". */
export const editionYear = (e: { startDate: Date }) => new Date(e.startDate).getFullYear();

/** The symposium's own days (may be non-consecutive, e.g. 20, 30 and 31 Jan). Falls back to start/end. */
export const eventDays = (e: { eventDays: string[]; startDate: Date; endDate: Date }) =>
  (e.eventDays?.length ? e.eventDays : [new Date(e.startDate).toISOString().slice(0, 10), new Date(e.endDate).toISOString().slice(0, 10)])
    .map((d) => new Date(`${d}T09:00:00+05:00`));

/** "20, 30 & 31 January 2027" */
export function eventDaysLabel(e: { eventDays: string[]; startDate: Date; endDate: Date }, month: "long" | "short" = "long") {
  const days = eventDays(e);
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", ...o }).format(d);
  const sameMonth = days.every((d) => fmt(d, { month: "short", year: "numeric" }) === fmt(days[0], { month: "short", year: "numeric" }));
  if (sameMonth) {
    const nums = days.map((d) => fmt(d, { day: "numeric" }));
    const list = nums.length > 1 ? `${nums.slice(0, -1).join(", ")} & ${nums.at(-1)}` : nums[0];
    return `${list} ${fmt(days[0], { month, year: "numeric" })}`;
  }
  return days.map((d) => fmt(d, { day: "numeric", month: "short" })).join(", ") + " " + fmt(days.at(-1)!, { year: "numeric" });
}
export const DAY_THEMES: Record<number, string> = { 1: "Artificial Intelligence", 2: "Robotics", 3: "Digitization" };
