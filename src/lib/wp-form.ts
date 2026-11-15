import "server-only";
import { listDepartments } from "./departments";
import { and, asc, eq, ne } from "drizzle-orm";
import { db, schema as s } from "./db";
import { getEvent } from "./event";

import { ymdPk } from "./utils";

/** Everything Form A needs: venues, theme weeks, date window, department suggestions. */
export async function formAContext() {
  const [ev, venues, depts] = await Promise.all([
    getEvent(),
    db.select().from(s.venues).where(and(eq(s.venues.active, true), ne(s.venues.usage, "SCIENTIFIC"))).orderBy(asc(s.venues.building), asc(s.venues.name)),
    listDepartments(),
  ]);
  const window = { from: ev.workshopStart ? ymdPk(ev.workshopStart) : "", to: ev.workshopEnd ? ymdPk(ev.workshopEnd) : "", today: ymdPk(new Date()) };
  return { ev, venues, depts, weeks: ev.themeWeeks, window };
}
