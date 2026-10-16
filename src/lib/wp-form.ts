import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "./db";
import { getEvent } from "./event";
import { departments } from "./wp";
import { ymdPk } from "./utils";

/** Everything Form A needs: venues, theme weeks, date window, department suggestions. */
export async function formAContext() {
  const [ev, venues, depts] = await Promise.all([
    getEvent(),
    db.select().from(s.venues).where(eq(s.venues.active, true)).orderBy(asc(s.venues.name)),
    departments(),
  ]);
  const window = { from: ev.workshopStart ? ymdPk(ev.workshopStart) : "", to: ev.workshopEnd ? ymdPk(ev.workshopEnd) : "" };
  return { ev, venues, depts, weeks: ev.themeWeeks, window };
}
