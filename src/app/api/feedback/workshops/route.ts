import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/lib/db";
import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { maybeIssueWorkshopCert } from "@/lib/certificates";
import { WF_STATEMENTS, wfSummary } from "@/lib/workshop-feedback";

export const dynamic = "force-dynamic";
const n5 = z.coerce.number().int().min(1).max(5);
const schema = z.object({
  token: z.string().max(80).optional(), regNo: z.string().max(30).optional(), email: z.string().max(200).optional(),
  slug: z.string().min(1).max(200),
  answers: z.array(n5).length(WF_STATEMENTS.length, "Please rate every statement."),
  overall: n5, recommend: z.enum(["YES", "MAYBE", "NO"]), contact: z.boolean(), comments: z.string().max(2000).optional(),
});

/** N7 workshop feedback (12 statements, overall rating, recommend, contact opt-in). One response per participant per workshop.
 *  N6: if the department has already confirmed attendance, the workshop certificate is issued straight away. */
export async function POST(req: Request) {
  if (!rateLimit(`wf:${ipOf(req)}`, 20, 10 * 60_000)) return fail("Too many submissions. Try again in a few minutes.", 429);
  const p = schema.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  const d = p.data;
  const [r] = await db.select().from(s.registrations).where(d.token ? eq(s.registrations.accessToken, d.token) : eq(s.registrations.regNo, (d.regNo ?? "").trim().toUpperCase().replace(/-W\d+$/, "")));
  if (!r || (!d.token && r.email.toLowerCase() !== (d.email ?? "").trim().toLowerCase())) return fail("We could not find a registration with these details.", 404);
  const [row] = await db.select({ i: s.registrationItems, w: s.sessions }).from(s.registrationItems).innerJoin(s.sessions, eq(s.sessions.id, s.registrationItems.sessionId))
    .where(and(eq(s.registrationItems.registrationId, r.id), eq(s.sessions.slug, d.slug), eq(s.sessions.type, "WORKSHOP")));
  if (!row) return fail("This workshop is not on your registration.", 404);
  if (!row.w.feedbackOpen) return fail("Feedback for this workshop is closed.", 403);
  if (row.w.startsAt > new Date()) return fail("Feedback opens when the workshop starts.", 403);
  const [dup] = await db.select({ id: s.feedback.id }).from(s.feedback).where(and(eq(s.feedback.sessionId, row.w.id), eq(s.feedback.registrationId, r.id)));
  if (dup) return fail("You have already submitted feedback for this workshop. Thank you!", 409);
  await db.insert(s.feedback).values({
    sessionId: row.w.id, registrationId: r.id, regNo: r.regNo, answers: d.answers, overall: d.overall, ...wfSummary(d.answers),
    recommend: d.recommend === "YES", recommendChoice: d.recommend, contactOk: d.contact, comments: d.comments?.trim() || null,
  });
  const cert = await maybeIssueWorkshopCert(row.i.id).catch((e) => { console.error(e); return null; });
  return ok({ ok: true, certificate: !!cert, verified: !!row.i.verifiedAt });
}
