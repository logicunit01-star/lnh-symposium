import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db, schema as s } from "./db";
import { getEvent } from "./event";
import { sendTemplate } from "./email";
import { appUrl, randomToken } from "./utils";
import { INVITE_LABEL, PEOPLE_ROLES, slotLabel } from "./scientific";
import { slotOf } from "./programme";

export type Invite = {
  kind: "PERSON" | "POSTER"; id: string; name: string; email: string | null; role: string; roleKey: string; status: string; reminders: number;
  invitedAt: Date | null; respondedAt: Date | null; session: string | null; when: string | null; venue: string | null; topic: string | null; token: string | null; note?: string | null;
  date?: string | null; time?: string | null; department?: string | null; abstractRef?: string | null;
};

/** Everyone who should receive an invitation: people on approved, scheduled sessions + accepted posters. */
export async function allInvites(): Promise<Invite[]> {
  const ev = await getEvent();
  const people = await db.select({ p: s.sessionPeople, title: s.sessions.title, slotKey: s.sessions.slotKey, venue: s.sessions.hall, department: s.sessions.department, ref: s.abstracts.refNo })
    .from(s.sessionPeople).innerJoin(s.sessions, eq(s.sessions.id, s.sessionPeople.sessionId)).leftJoin(s.abstracts, eq(s.abstracts.id, s.sessionPeople.abstractId))
    .where(and(eq(s.sessions.status, "APPROVED"), eq(s.sessions.proposal, true), isNotNull(s.sessions.slotKey)));
  const posters = await db.select({ a: s.abstracts, venue: s.venues.name }).from(s.abstracts).leftJoin(s.venues, eq(s.venues.id, s.abstracts.venueId))
    .where(and(eq(s.abstracts.status, "ACCEPTED"), eq(s.abstracts.acceptedAs, "POSTER")));
  return [
    ...people.map(({ p, title, slotKey, venue, department, ref }) => {
      const sl = slotOf(ev.sessionSlots, slotKey);
      return { kind: "PERSON" as const, id: p.id, name: p.name, email: p.email, role: PEOPLE_ROLES[p.role] ?? p.role, roleKey: p.role, status: p.inviteStatus, reminders: p.reminders, invitedAt: p.invitedAt, respondedAt: p.respondedAt,
        session: title, when: sl ? `${slotLabel(sl)}${p.timeSlot ? ` (your slot ${p.timeSlot})` : ""}` : null, venue, topic: p.topic, token: p.inviteToken, note: p.responseNote,
        date: sl ? slotLabel(sl).split(" · ")[0] : null, time: sl ? `${sl.start}–${sl.end}${p.timeSlot ? ` (your slot ${p.timeSlot})` : ""}` : null, department, abstractRef: ref };
    }),
    ...posters.map(({ a, venue }) => ({ kind: "POSTER" as const, id: a.id, name: a.presentingAuthor, email: a.email, role: "Poster presenter", roleKey: "POSTER", status: a.inviteStatus, reminders: a.reminders, invitedAt: a.invitedAt, respondedAt: a.respondedAt,
      session: "Poster presentation", when: a.placement || "Poster display and judging: see the released programme", venue: venue ?? "Exhibition Hall (Convention Center)", topic: a.abstractTitle, token: a.inviteToken,
      date: a.placement || "See the released programme", time: null, department: a.specialty, abstractRef: a.refNo })),
  ];
}

/** Chairs, co-chairs and moderators get the chair template; speakers, panelists and abstract presenters the speaker template. */
export const CHAIR_ROLES = ["CHAIR", "CO_CHAIR", "MODERATOR"];

async function mail(i: Invite, token: string, reminder: boolean) {
  const key = reminder ? "INVITE_REMINDER" : CHAIR_ROLES.includes(i.roleKey) ? "INVITE_CHAIR" : "INVITE_SPEAKER";
  return sendTemplate(key, i.email!, {
    name: i.name, role: i.role, session_name: i.session, session_date: i.date ?? i.when, session_time: i.time, venue: i.venue, department: i.department,
    abstract_title: i.roleKey === "PRESENTER" || i.kind === "POSTER" ? i.topic : null, abstract_id: i.abstractRef, author_name: i.abstractRef ? i.name : null,
    status: INVITE_LABEL[i.status], link: `${appUrl()}/invite/${token}`,
  }, { ref: i.abstractRef ?? i.session });
}

/** Send to everyone not yet invited (or one person). Returns counts. */
export async function sendInvites(only?: { kind: string; id: string }) {
  const list = (await allInvites()).filter((i) => (only ? i.kind === only.kind && i.id === only.id : i.status === "NOT_SENT"));
  let sent = 0, failed = 0;
  for (const i of list) {
    if (!i.email) { failed++; await setStatus(i, { inviteStatus: "FAILED" }); continue; }
    const token = i.token ?? randomToken(18);
    const r = await mail(i, token, false);
    const ok = r !== "FAILED";
    ok ? sent++ : failed++;
    await setStatus(i, { inviteToken: token, inviteStatus: ok ? "SENT" : "FAILED", invitedAt: new Date() });
  }
  return { sent, failed };
}

/** Reminders to people who have not answered for at least `days` days. */
export async function sendReminders(days = 3) {
  const cutoff = Date.now() - days * 864e5;
  const list = (await allInvites()).filter((i) => i.status === "SENT" && i.token && i.email && (i.invitedAt?.getTime() ?? 0) < cutoff);
  for (const i of list) {
    await mail(i, i.token!, true);
    await setStatus(i, i.kind === "PERSON" ? { reminders: i.reminders + 1, lastReminderAt: new Date() } : { reminders: i.reminders + 1 });
  }
  return list.length;
}

export async function setStatus(i: { kind: string; id: string }, patch: Record<string, unknown>) {
  if (i.kind === "PERSON") await db.update(s.sessionPeople).set(patch as any).where(eq(s.sessionPeople.id, i.id));
  else {
    const { lastReminderAt, responseNote, ...rest } = patch as any;
    await db.update(s.abstracts).set(rest).where(eq(s.abstracts.id, i.id));
  }
}

/** Public response by token. */
export async function findByToken(token: string) {
  const [p] = await db.select().from(s.sessionPeople).where(eq(s.sessionPeople.inviteToken, token));
  if (p) return (await allInvites()).find((i) => i.kind === "PERSON" && i.id === p.id) ?? null;
  const [a] = await db.select().from(s.abstracts).where(eq(s.abstracts.inviteToken, token));
  if (a) return (await allInvites()).find((i) => i.kind === "POSTER" && i.id === a.id) ?? null;
  return null;
}

