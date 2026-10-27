import "server-only";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { db, schema as s } from "./db";
import { nextNumber, pad } from "./counters";
import { getEvent, abstractWindow, editionYear } from "./event";
import { fmtDate, appUrl } from "./utils";
import { sendEmail, emailLayout } from "./notify";
import { DEPARTMENTS, SECTIONS, titleKey, words, PREF_LABEL, KIND_LABEL } from "./scientific";

const req = (max: number) => z.string().trim().min(1, "Required").max(max);

/** Abstract Submission Form (LNH, Oct 2026). */
export const abstractInput = z.object({
  presentationPref: z.enum(["ORAL", "POSTER", "EITHER"], { errorMap: () => ({ message: "Choose a presentation format" }) }),
  specialty: z.string().refine((v) => DEPARTMENTS.includes(v), "Choose a speciality / department"),
  title: z.enum(["Prof.", "Dr.", "Mr.", "Ms."]),
  fullName: req(120), designation: req(120), organization: req(160), department: req(120),
  city: req(60), country: req(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  mobile: z.string().trim().regex(/^(\+92|0092|0)?3\d{2}[- ]?\d{7}$|^\+?\d[\d\s-]{7,18}$/, "Enter a valid contact number"),
  coAuthors: z.array(z.object({ name: req(120), affiliation: req(200) })).min(1, "Add at least one co-author").max(6, "Maximum 6 co-authors"),
  abstractTitle: z.string().trim().min(5, "Enter the full title").refine((v) => words(v) <= 35, "Title must be 35 words or fewer"),
  kind: z.enum(["ORIGINAL", "CASE"]),
  sections: z.record(z.string().trim().max(4000)),
  keywords: z.array(z.string().trim().min(1).max(40)).min(3, "Give 3 to 5 keywords").max(5, "Give 3 to 5 keywords"),
  declaration: z.literal(true, { errorMap: () => ({ message: "Please confirm the declaration" }) }),
});
export type AbstractInput = z.infer<typeof abstractInput>;

class FieldError extends Error { constructor(msg: string, public field: string) { super(msg); } }

export async function logAbstract(abstractId: string, actor: string | null, action: string, note?: string | null) {
  await db.insert(s.abstractEvents).values({ abstractId, actor, action, note: note ?? null });
}

export async function submitAbstract(input: AbstractInput, accountId: string) {
  const ev = await getEvent();
  const w = abstractWindow(ev);
  if (w !== "OPEN") throw new Error(w === "CLOSED" ? "Abstract submission is closed." : "Abstract submission has not opened yet.");
  const fields = SECTIONS[input.kind];
  for (const [k, label] of fields) if (!input.sections[k]?.trim()) throw new FieldError(`${label} is required`, `s_${k}`);
  const sections = Object.fromEntries(fields.map(([k]) => [k, input.sections[k].trim()]));
  const wc = Object.values(sections).reduce((a, v) => a + words(v), 0);
  if (wc > ev.abstractWordLimit) throw new FieldError(`The abstract has ${wc} words; the limit is ${ev.abstractWordLimit} (title, authors and affiliations excluded).`, "sections");
  const key = titleKey(input.abstractTitle);
  const [dup] = await db.select({ refNo: s.abstracts.refNo }).from(s.abstracts).where(eq(s.abstracts.titleKey, key));
  if (dup) throw new FieldError(`An abstract with this title was already submitted (${dup.refNo}). Duplicate submissions are not accepted.`, "abstractTitle");

  const year = String(editionYear(ev));
  const refNo = `ABS-${year}-${pad(await nextNumber(`abs2-${year}`))}`;
  const authors = [`${input.title} ${input.fullName} (${input.organization})`, ...input.coAuthors.map((c) => `${c.name} (${c.affiliation})`)].join("; ");
  const body = fields.map(([k, label]) => `${label}: ${sections[k]}`).join("\n\n");
  const [a] = await db.insert(s.abstracts).values({
    refNo, accountId, type: input.presentationPref === "POSTER" ? "POSTER" : "ORAL", presentationPref: input.presentationPref, kind: input.kind,
    title: input.title, fullName: input.fullName, designation: input.designation, organization: input.organization, department: input.department,
    city: input.city, country: input.country, email: input.email, mobile: input.mobile, specialty: input.specialty, assignedDept: input.specialty,
    coAuthors: input.coAuthors, authors, presentingAuthor: `${input.title} ${input.fullName}`, abstractTitle: input.abstractTitle.trim(), titleKey: key,
    sections, body, keywords: input.keywords.join(", "), wordCount: wc,
  }).returning();
  await logAbstract(a.id, a.email, "SUBMITTED", `${PREF_LABEL[input.presentationPref]} · ${input.specialty}`);
  await sendEmail(a.email, `${ev.name}: abstract received (${refNo})`, emailLayout("Abstract received",
    `<p>Dear ${a.title} ${a.fullName},</p><p>Your abstract <b>“${a.abstractTitle}”</b> has been received.</p>
     <p>Abstract ID: <b>${refNo}</b><br>Preferred format: ${PREF_LABEL[input.presentationPref]}<br>Type: ${KIND_LABEL[input.kind]}<br>Speciality: ${input.specialty}</p>
     <p>The department and the Scientific Committee will review it${ev.abstractDeadline ? ` after the deadline (${fmtDate(ev.abstractDeadline)})` : ""}. All further correspondence will be with you as the presenting author.</p>`,
    { label: "Track your abstract", href: `${appUrl()}/account/bookings` })).catch(() => {});
  return a;
}

/** Department review window state. */
export function reviewWindow(ev: { abstractP1Open: Date | null; abstractP1Close: Date | null; abstractP2Open: Date | null; abstractP2Close: Date | null }, now = new Date()) {
  const inP = (a: Date | null, b: Date | null) => !!a && !!b && now >= a && now <= b;
  return { p1: inP(ev.abstractP1Open, ev.abstractP1Close), p2: inP(ev.abstractP2Open, ev.abstractP2Close) };
}

/** Duplicate-title check for the live form. */
export async function titleTaken(title: string, exceptId?: string) {
  const key = titleKey(title);
  const [hit] = await db.select({ refNo: s.abstracts.refNo }).from(s.abstracts).where(exceptId ? and(eq(s.abstracts.titleKey, key), ne(s.abstracts.id, exceptId)) : eq(s.abstracts.titleKey, key));
  return hit?.refNo ?? null;
}
