import "server-only";
import { z } from "zod";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db, schema as s } from "./db";
import type { SessionSlot } from "./db/schema";

const person = z.object({ name: z.string().trim().min(2, "Name required").max(120), phone: z.string().trim().min(7, "Contact required").max(30), email: z.string().trim().toLowerCase().email("Valid email required") });
const guest = person.extend({
  designation: z.string().trim().min(1, "Designation required").max(120), affiliation: z.string().trim().min(1, "Affiliation required").max(200),
  topic: z.string().trim().min(2, "Topic required").max(250), timeSlot: z.string().trim().min(1, "Time slot required").max(40),
});
const presenter = person.extend({ topic: z.string().trim().min(2, "Title required").max(300), timeSlot: z.string().trim().min(1, "Time slot required").max(40), abstractRef: z.string().trim().max(20).optional() });

const loose = z.object({ name: z.string().trim().max(120).default(""), phone: z.string().trim().max(30).default(""), email: z.string().trim().toLowerCase().max(200).default("") });
const blank = { name: "", phone: "", email: "" };

/** Scientific Sessions' Program Details form (SC Agenda form, Oct 2026). Plenary and debate sessions (committee only) need
 *  keynote speaker(s), panelists and a moderator; chair and co-chair are optional for them. */
export const sessionProposalInput = z.object({
  department: z.string().min(2),
  title: z.string().trim().min(5, "Session title / topic required").max(200),
  sessionFormat: z.enum(["INVITED_PAPERS", "PAPERS_ONLY", "GUEST_ONLY", "PANEL", "CASE_BASED", "OTHER", "PLENARY", "DEBATE"]),
  formatOther: z.string().trim().max(120).optional(),
  preferredSlots: z.array(z.string()).min(1, "Choose at least one day and time slot"),
  expectedAudience: z.coerce.number().int().min(1, "Expected participants required").max(2000),
  chair: loose.default(blank), coChair: loose.default(blank), moderator: loose.default(blank),
  panelists: z.array(guest).max(12),
  speakers: z.array(guest).max(12),
  hasPresenters: z.boolean(),
  presenters: z.array(presenter).max(20),
}).superRefine((d, ctx) => {
  const special = d.sessionFormat === "PLENARY" || d.sessionFormat === "DEBATE";
  const need: ["chair" | "coChair" | "moderator", boolean][] = [["chair", !special], ["coChair", !special], ["moderator", true]];
  for (const [k, required] of need) {
    const v = d[k];
    if (!required && !v.name && !v.phone && !v.email) continue;
    const r = person.safeParse(v);
    if (!r.success) r.error.issues.forEach((i) => ctx.addIssue({ code: "custom", path: [k, ...i.path], message: i.message }));
  }
  if (d.sessionFormat === "OTHER" && !d.formatOther) ctx.addIssue({ code: "custom", path: ["formatOther"], message: "Please specify the session type" });
  if ((d.sessionFormat === "PANEL" || d.sessionFormat === "DEBATE") && d.panelists.length < 2) ctx.addIssue({ code: "custom", path: ["panelists"], message: d.sessionFormat === "DEBATE" ? "A debate needs at least two panelists" : "A panel needs more than one panelist" });
  if (d.sessionFormat === "PLENARY" && !d.panelists.length) ctx.addIssue({ code: "custom", path: ["panelists"], message: "Add the plenary panelists" });
  if (["INVITED_PAPERS", "GUEST_ONLY"].includes(d.sessionFormat) && !d.speakers.length) ctx.addIssue({ code: "custom", path: ["speakers"], message: "Add at least one guest / invited speaker" });
  if (special && !d.speakers.length) ctx.addIssue({ code: "custom", path: ["speakers"], message: "Add the keynote speaker" });
  if (d.hasPresenters && !d.presenters.length) ctx.addIssue({ code: "custom", path: ["presenters"], message: "Add the research paper presenters" });
});
export type SessionProposal = z.infer<typeof sessionProposalInput>;

/** Secretariat pre-fill (SC V1.0): preferred day/time, expected participants and the department; the department completes the rest. */
export const sessionPrefillInput = z.object({
  department: z.string().min(2, "Choose the department"),
  title: z.string().trim().max(200).optional(),
  sessionFormat: z.enum(["INVITED_PAPERS", "PAPERS_ONLY", "GUEST_ONLY", "PANEL", "CASE_BASED", "OTHER"]).optional().or(z.literal("").transform(() => undefined)),
  preferredSlots: z.array(z.string()).min(1, "Choose at least one day and time slot"),
  expectedAudience: z.coerce.number().int().min(1, "Expected participants required").max(2000),
});

export const slotOf = (slots: SessionSlot[], key: string | null | undefined) => slots.find((x) => x.key === key) ?? null;
export const slotTimes = (sl: SessionSlot) => ({ startsAt: new Date(`${sl.day}T${sl.start}:00+05:00`), endsAt: new Date(`${sl.day}T${sl.end}:00+05:00`) });
export const dayNumber = (days: string[], day: string) => Math.max(1, days.indexOf(day) + 1);

/** Who may edit a scientific session right now. */
export function editRule(opts: { role: string; isDept: boolean; ownDept: boolean; lockAt: Date | null; locked: boolean; editGrantUntil: Date | null; now?: Date }) {
  const now = opts.now ?? new Date();
  const afterLock = (opts.lockAt && now > opts.lockAt) || opts.locked;
  if (!afterLock) return opts.isDept ? (opts.ownDept ? null : "This session belongs to another department.") : null;
  if (["SECRETARIAT", "ADMIN", "SUPER_ADMIN"].includes(opts.role) && opts.editGrantUntil && opts.editGrantUntil > now) return null;
  return opts.isDept
    ? "The agenda is locked. Changes now need Scientific Committee Chair approval and are made by the secretariat."
    : "Locked. The Scientific Committee Chair must authorise a change before the secretariat can edit.";
}

const keyOf = (p: { email: string | null; name: string }) => (p.email?.toLowerCase().trim() || p.name.toLowerCase().replace(/^(prof|dr|mr|ms|mrs)\.?\s+/i, "").replace(/\s+/g, " ").trim());

/** People booked in two sessions at the same allotted slot (chairs, moderators, panelists, speakers, presenters). */
export async function personConflicts() {
  const rows = await db.select({ p: s.sessionPeople, slotKey: s.sessions.slotKey, title: s.sessions.title, sid: s.sessions.id })
    .from(s.sessionPeople).innerJoin(s.sessions, eq(s.sessions.id, s.sessionPeople.sessionId))
    .where(and(isNotNull(s.sessions.slotKey), inArray(s.sessions.status, ["SUBMITTED", "UNDER_REVIEW", "APPROVED"])));
  const map = new Map<string, { name: string; slot: string; sessions: Map<string, string> }>();
  for (const r of rows) {
    const k = `${keyOf(r.p)}@${r.slotKey}`;
    const v = map.get(k) ?? { name: r.p.name, slot: r.slotKey!, sessions: new Map() };
    v.sessions.set(r.sid, r.title); map.set(k, v);
  }
  return [...map.values()].filter((v) => v.sessions.size > 1).map((v) => ({ name: v.name, slot: v.slot, sessions: [...v.sessions.entries()].map(([id, title]) => ({ id, title })) }));
}

/** Other sessions where this session's people also appear (any slot) — shown to departments while drafting. */
export async function alsoAppearsIn(sessionId: string) {
  const mine = await db.select().from(s.sessionPeople).where(eq(s.sessionPeople.sessionId, sessionId));
  if (!mine.length) return [];
  const others = await db.select({ p: s.sessionPeople, title: s.sessions.title, slotKey: s.sessions.slotKey }).from(s.sessionPeople)
    .innerJoin(s.sessions, eq(s.sessions.id, s.sessionPeople.sessionId)).where(and(inArray(s.sessions.status, ["SUBMITTED", "UNDER_REVIEW", "APPROVED"])));
  const keys = new Set(mine.map(keyOf));
  return others.filter((o) => o.p.sessionId !== sessionId && keys.has(keyOf(o.p))).map((o) => ({ name: o.p.name, role: o.p.role, title: o.title, slotKey: o.slotKey }));
}

/** Replace a session's people while keeping invitation history for the same person in the same role. */
export async function savePeople(sessionId: string, list: { role: string; name: string; email: string | null; phone: string | null; designation?: string | null; affiliation?: string | null; topic?: string | null; timeSlot?: string | null; abstractId?: string | null }[]) {
  const existing = await db.select().from(s.sessionPeople).where(eq(s.sessionPeople.sessionId, sessionId));
  const used = new Set<string>();
  for (const [i, p] of list.entries()) {
    const match = existing.find((e) => !used.has(e.id) && e.role === p.role && keyOf(e) === keyOf(p));
    const data = { role: p.role, name: p.name, email: p.email, phone: p.phone, designation: p.designation ?? null, affiliation: p.affiliation ?? null, topic: p.topic ?? null, timeSlot: p.timeSlot ?? null, order: i, abstractId: p.abstractId ?? null };
    if (match) { used.add(match.id); await db.update(s.sessionPeople).set(data).where(eq(s.sessionPeople.id, match.id)); }
    else await db.insert(s.sessionPeople).values({ sessionId, ...data });
  }
  const drop = existing.filter((e) => !used.has(e.id));
  for (const d of drop) {
    if (d.inviteStatus === "NOT_SENT") await db.delete(s.sessionPeople).where(eq(s.sessionPeople.id, d.id));
    else await db.update(s.sessionPeople).set({ inviteStatus: "WITHDRAWN" }).where(eq(s.sessionPeople.id, d.id)); // keep the trail
  }
}

/** Load a session into the shape of the department form. */
export async function proposalInit(id: string) {
  const ses = await db.query.sessions.findFirst({ where: eq(s.sessions.id, id), with: { people: true, abstracts: true, venue: true } });
  if (!ses) return null;
  const live = ses.people.filter((p) => p.inviteStatus !== "WITHDRAWN").sort((a, b) => a.order - b.order);
  const one = (role: string) => { const p = live.find((x) => x.role === role); return p ? { name: p.name, phone: p.phone ?? "", email: p.email ?? "" } : undefined; };
  const many = (...roles: string[]) => live.filter((x) => roles.includes(x.role)).map((p) => ({ name: p.name, phone: p.phone ?? "", email: p.email ?? "", designation: p.designation ?? "", affiliation: p.affiliation ?? "", topic: p.topic ?? "", timeSlot: p.timeSlot ?? "" }));
  const refOf = (aid: string | null) => ses.abstracts.find((a) => a.id === aid)?.refNo ?? "";
  return {
    session: ses,
    init: {
      id: ses.id, department: ses.department ?? "", title: ses.status === "DRAFT" && ses.title.endsWith("(details to be completed)") ? "" : ses.title, draft: ses.status === "DRAFT", sessionFormat: ses.sessionFormat ?? "", formatOther: ses.formatOther ?? "",
      preferredSlots: ses.preferredSlots, expectedAudience: ses.expectedAudience, chair: one("CHAIR"), coChair: one("CO_CHAIR"), moderator: one("MODERATOR"),
      panelists: many("PANELIST"), speakers: many("SPEAKER", "KEYNOTE"),
      presenters: live.filter((x) => x.role === "PRESENTER").map((p) => ({ name: p.name, phone: p.phone ?? "", email: p.email ?? "", topic: p.topic ?? "", timeSlot: p.timeSlot ?? "", abstractRef: refOf(p.abstractId) })),
    },
  };
}

export async function acceptedOralFor(dept: string | null) {
  const rows = await db.select({ refNo: s.abstracts.refNo, title: s.abstracts.abstractTitle, author: s.abstracts.presentingAuthor, email: s.abstracts.email, phone: s.abstracts.mobile, specialty: s.abstracts.specialty, assigned: s.abstracts.assignedDept })
    .from(s.abstracts).where(and(eq(s.abstracts.status, "ACCEPTED"), eq(s.abstracts.acceptedAs, "ORAL")));
  return rows.filter((r) => !dept || r.specialty === dept || r.assigned === dept).map(({ refNo, title, author, email, phone }) => ({ refNo, title, author, email, phone }));
}

/** Uploaded agenda template file names by format (no file data). */
export async function templateFiles(): Promise<Record<string, string>> {
  const rows = await db.select({ format: s.agendaTemplateFiles.format, fileName: s.agendaTemplateFiles.fileName }).from(s.agendaTemplateFiles);
  return Object.fromEntries(rows.map((r) => [r.format, r.fileName]));
}
