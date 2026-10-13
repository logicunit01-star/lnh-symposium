import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema as s } from "./db";

export async function getProgramme(filter?: { types?: string[]; registrable?: boolean }) {
  const conds = [];
  if (filter?.types) conds.push(inArray(s.sessions.type, filter.types as any));
  if (filter?.registrable != null) conds.push(eq(s.sessions.registrable, filter.registrable));
  return db.query.sessions.findMany({
    where: conds.length ? and(...conds) : undefined,
    orderBy: [asc(s.sessions.day), asc(s.sessions.startsAt), asc(s.sessions.title)],
    with: { speakers: { with: { speaker: true } } },
  });
}
export type ProgrammeSession = Awaited<ReturnType<typeof getProgramme>>[number];

/** Seats taken per session (pending + paid + waived). */
export async function seatsTaken(): Promise<Record<string, number>> {
  const rows = await db.select({ id: s.registrationItems.sessionId, n: sql<number>`count(*)::int` })
    .from(s.registrationItems)
    .innerJoin(s.registrations, eq(s.registrations.id, s.registrationItems.registrationId))
    .where(inArray(s.registrations.paymentStatus, ["PENDING", "PAID", "WAIVED"]))
    .groupBy(s.registrationItems.sessionId);
  return Object.fromEntries(rows.map((r) => [r.id, r.n]));
}

export async function getSpeakers(featuredOnly = false) {
  return db.query.speakers.findMany({
    where: featuredOnly ? eq(s.speakers.featured, true) : undefined,
    orderBy: [asc(s.speakers.order), asc(s.speakers.name)],
    with: { sessions: { with: { session: true } } },
  });
}
export async function getCommittee() {
  return db.select().from(s.committee).orderBy(asc(s.committee.order));
}
