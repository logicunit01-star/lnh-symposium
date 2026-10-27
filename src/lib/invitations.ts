import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { db, schema as s } from "./db";
import { getEvent } from "./event";
import { sendEmail, emailLayout } from "./notify";
import { appUrl, randomToken } from "./utils";
import { PEOPLE_ROLES, slotLabel } from "./scientific";
import { slotOf } from "./programme";

export type Invite = {
  kind: "PERSON" | "POSTER"; id: string; name: string; email: string | null; role: string; status: string; reminders: number;
  invitedAt: Date | null; respondedAt: Date | null; session: string | null; when: string | null; venue: string | null; topic: string | null; token: string | null; note?: string | null;
};

/** Everyone who should receive an invitation: people on approved, scheduled sessions + accepted posters. */
export async function allInvites(): Promise<Invite[]> {
  const ev = await getEvent();
  const people = await db.select({ p: s.sessionPeople, title: s.sessions.title, slotKey: s.sessions.slotKey, venue: s.sessions.hall })
    .from(s.sessionPeople).innerJoin(s.sessions, eq(s.sessions.id, s.sessionPeople.sessionId))
    .where(and(eq(s.sessions.status, "APPROVED"), eq(s.sessions.proposal, true), isNotNull(s.sessions.slotKey)));
  const posters = await db.select({ a: s.abstracts, venue: s.venues.name }).from(s.abstracts).leftJoin(s.venues, eq(s.venues.id, s.abstracts.venueId))
    .where(and(eq(s.abstracts.status, "ACCEPTED"), eq(s.abstracts.acceptedAs, "POSTER")));
  return [
    ...people.map(({ p, title, slotKey, venue }) => {
      const sl = slotOf(ev.sessionSlots, slotKey);
      return { kind: "PERSON" as const, id: p.id, name: p.name, email: p.email, role: PEOPLE_ROLES[p.role] ?? p.role, status: p.inviteStatus, reminders: p.reminders, invitedAt: p.invitedAt, respondedAt: p.respondedAt,
        session: title, when: sl ? `${slotLabel(sl)}${p.timeSlot ? ` (your slot ${p.timeSlot})` : ""}` : null, venue, topic: p.topic, token: p.inviteToken, note: p.responseNote };
    }),
    ...posters.map(({ a, venue }) => ({ kind: "POSTER" as const, id: a.id, name: a.presentingAuthor, email: a.email, role: "Poster presenter", status: a.inviteStatus, reminders: a.reminders, invitedAt: a.invitedAt, respondedAt: a.respondedAt,
      session: "Poster presentation", when: a.placement || "Poster display and judging: see the released programme", venue: venue ?? "Exhibition Hall (Convention Center)", topic: `${a.refNo}: ${a.abstractTitle}`, token: a.inviteToken })),
  ];
}

async function mail(i: Invite, token: string, reminder: boolean) {
  const ev = await getEvent();
  const url = `${appUrl()}/invite/${token}`;
  const subject = `${reminder ? "Reminder: " : ""}${ev.name}: invitation as ${i.role}${i.session && i.kind === "PERSON" ? ` · ${i.session}` : ""}`;
  const html = emailLayout(reminder ? "A reminder about your invitation" : "Invitation", `
    <p>Dear ${i.name},</p>
    <p>On behalf of the Scientific Committee, we are pleased to invite you as <b>${i.role}</b> at the ${ev.name}.</p>
    <table style="font-size:14px;border-collapse:collapse">
      ${i.session ? `<tr><td style="padding:3px 12px 3px 0;color:#5b6b8c">Session</td><td><b>${i.session}</b></td></tr>` : ""}
      ${i.topic ? `<tr><td style="padding:3px 12px 3px 0;color:#5b6b8c">Topic</td><td>${i.topic}</td></tr>` : ""}
      ${i.when ? `<tr><td style="padding:3px 12px 3px 0;color:#5b6b8c">Date and time</td><td>${i.when}</td></tr>` : ""}
      ${i.venue ? `<tr><td style="padding:3px 12px 3px 0;color:#5b6b8c">Venue</td><td>${i.venue}, ${ev.venue}</td></tr>` : ""}
    </table>
    <p>Please confirm whether you accept this invitation.</p>`, { label: "Accept or decline", href: url });
  return sendEmail(i.email!, subject, html);
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

