import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db, schema as s } from "./db";

/** Programme pages (Dashboard Instructions, revised 06-11-2026): Pre-Symposium Webinar / Panel Discussion and Meet the Experts. */
// Sadaf (10 Nov): no webinar/panel discussion; the WEBINAR page (internal key kept) is now "Pre-symposium activities"
// (e.g. the inauguration of two new services); an "Inaugural session" page is added. The Secretariat enters the details.
export const PAGE_KEYS = { WEBINAR: "WEBINAR", INAUGURAL: "INAUGURAL", EXPERTS: "EXPERTS" } as const;
export type PageKey = keyof typeof PAGE_KEYS;
export const PAGE_TITLE: Record<PageKey, string> = { WEBINAR: "Pre-symposium activities", INAUGURAL: "Inaugural session", EXPERTS: "Meet the Experts" };
export const PAGE_PATH: Record<PageKey, string> = { WEBINAR: "/programme/pre-symposium-activities", INAUGURAL: "/programme/inaugural-session", EXPERTS: "/programme/meet-the-experts" };

export type PublicGuest = { id: string; name: string; affiliation: string | null; qualification: string | null; topic: string | null; photo: string | null; order: number };

/** One page with its guests (photo data is served by /api/programme/guests/[id]/photo, never inlined). */
export async function getProgrammePage(key: PageKey) {
  const [page] = await db.select().from(s.programmePages).where(eq(s.programmePages.key, key));
  const guests = await db.select({
    id: s.programmeGuests.id, name: s.programmeGuests.name, affiliation: s.programmeGuests.affiliation, qualification: s.programmeGuests.qualification,
    topic: s.programmeGuests.topic, photoUrl: s.programmeGuests.photoUrl, photoMime: s.programmeGuests.photoMime, order: s.programmeGuests.order,
  }).from(s.programmeGuests).where(eq(s.programmeGuests.pageKey, key)).orderBy(asc(s.programmeGuests.order), asc(s.programmeGuests.createdAt));
  return {
    page: page ?? { key, title: PAGE_TITLE[key], dateText: null, format: null, description: null, published: false, updatedBy: null, updatedAt: new Date() },
    guests: guests.map((g): PublicGuest => ({ id: g.id, name: g.name, affiliation: g.affiliation, qualification: g.qualification, topic: g.topic, order: g.order,
      photo: g.photoMime ? `/api/programme/guests/${g.id}/photo` : g.photoUrl || null })),
  };
}

/** People on public sessions, without contact details (chairs, moderator, panelists, speakers, presenters). */
export type PublicPerson = { role: string; name: string; designation: string | null; affiliation: string | null; topic: string | null; timeSlot: string | null; order: number; abstractRef: string | null };
export async function publicPeople(sessionIds: string[]): Promise<Record<string, PublicPerson[]>> {
  if (!sessionIds.length) return {};
  const rows = await db.query.sessionPeople.findMany({
    where: inArray(s.sessionPeople.sessionId, sessionIds), orderBy: [asc(s.sessionPeople.order)], with: { abstract: { columns: { refNo: true } } },
  });
  const out: Record<string, PublicPerson[]> = {};
  for (const r of rows) (out[r.sessionId] ??= []).push({ role: r.role, name: r.name, designation: r.designation, affiliation: r.affiliation, topic: r.topic, timeSlot: r.timeSlot, order: r.order, abstractRef: r.abstract?.refNo ?? null });
  return out;
}
