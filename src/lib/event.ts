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
