import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/lib/db";
import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { getEvent } from "@/lib/event";

export const dynamic = "force-dynamic";
const r5 = z.coerce.number().int().min(1).max(5);
const schema = z.object({
  overall: r5, content: r5, speaker: r5, relevance: r5, organization: r5, recommend: z.boolean(), comments: z.string().max(2000).optional().nullable(),
  token: z.string().max(80).optional(), regNo: z.string().max(30).optional(), email: z.string().max(200).optional(),
});

/** Issues email 16 Nov 2026 (item 5): overall symposium feedback. Open from the first symposium day to participants with a
 *  confirmed symposium registration who were checked in (attended); one response per registration. */
export async function POST(req: Request) {
  if (!(await rateLimit(`symfb:${ipOf(req)}`, 10, 10 * 60_000))) return fail("Too many submissions. Try again in a few minutes.", 429);
  const p = schema.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  const d = p.data;
  const [r] = await db.select().from(s.registrations).where(d.token ? eq(s.registrations.accessToken, d.token) : eq(s.registrations.regNo, (d.regNo ?? "").trim().toUpperCase()));
  if (!r || (!d.token && r.email.toLowerCase() !== (d.email ?? "").trim().toLowerCase())) return fail("We could not find a registration with these details.", 404, d.token ? undefined : { regNo: "Check the registration number and email" });
  if (!r.hasPass || (r.paymentStatus !== "PAID" && r.paymentStatus !== "WAIVED")) return fail("Symposium feedback is for participants with a confirmed symposium registration.", 403);
  const ev = await getEvent();
  if (ev.startDate > new Date()) return fail("Symposium feedback opens on the first day of the symposium.", 403);
  if (!r.checkedInAt) return fail("Symposium feedback is for participants who attended. Your check-in has not been recorded; if you attended, please contact the registration desk.", 403);
  const [dup] = await db.select({ id: s.symposiumFeedback.id }).from(s.symposiumFeedback).where(eq(s.symposiumFeedback.registrationId, r.id));
  if (dup) return fail("You have already given symposium feedback. Thank you!", 409);
  await db.insert(s.symposiumFeedback).values({
    registrationId: r.id, regNo: r.regNo, overall: d.overall, content: d.content, speaker: d.speaker, relevance: d.relevance, organization: d.organization,
    recommend: d.recommend, comments: d.comments?.trim() || null,
  });
  return ok({ ok: true });
}
