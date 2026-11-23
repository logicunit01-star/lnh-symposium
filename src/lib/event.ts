import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { db, schema as s } from "./db";

/** Homepage defaults (homepage changes 11.11.2026) until the admin edits them in Event Settings. */
export const TICKER_DEFAULT = ["Avail Early-Bird Registration Discount", "Register Now", "Submit Your Abstract Online", "Pre-Symposium Workshops Coming Soon"]; // 20 Nov 2026
export const GALLERY_DEFAULT = "https://www.lnh.edu.pk/gallery/symposium-2025-gallery";

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
/** True until the end (23:59 Karachi) of the symposium's last day. */
export const beforeEventEnd = (e: { endDate: Date }, now = new Date()) => now.getTime() <= Date.parse(`${new Date(e.endDate.getTime() + 5 * 3600_000).toISOString().slice(0, 10)}T23:59:59+05:00`);
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

/** Home page wording editable in Admin → Event settings (16 Nov 2026). An empty field uses this built-in default. */
export const HOME_TEXT = {
  day1: "Artificial Intelligence", day1Short: "AI", day2: "Robotics", day2Short: "Robotics", day3: "Digitization", day3Short: "Digitization",
  frontiersEyebrow: "Three days · three frontiers", frontiersTitle: "One theme.", frontiersHighlight: "Three frontiers.",
  frontiersSub: "Shaping the new era of healthcare, explored through the technologies reshaping how hospitals diagnose, operate and deliver care.",
  glanceEyebrow: "At a glance", glanceTitle: "Three Days of", glanceHighlight: "Insights & Innovation", // 20 Nov 2026
} as const;
export type HomeTextKey = keyof typeof HOME_TEXT;
export const homeText = (e: { homeText?: Partial<Record<string, string>> | null }) =>
  Object.fromEntries(Object.entries(HOME_TEXT).map(([k, v]) => [k, e.homeText?.[k]?.trim() || v])) as Record<HomeTextKey, string>;
/** Day theme names (Day 1-3) as set in Event settings. */
export const dayThemes = (e: { homeText?: Partial<Record<string, string>> | null }): Record<number, string> => { const t = homeText(e); return { 1: t.day1, 2: t.day2, 3: t.day3 }; };
