import { and, eq, inArray, lte } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
/** N7: the participant's workshops (started, paid) for the feedback drop-down. By access token, or registration no. + email. */
export async function POST(req: Request) {
  if (!rateLimit(`wfl:${ipOf(req)}`, 20, 10 * 60_000)) return fail("Too many attempts. Try again in a few minutes.", 429);
  const b = await req.json().catch(() => ({}));
  const token = typeof b.token === "string" ? b.token : "";
  const regNo = typeof b.regNo === "string" ? b.regNo.trim().toUpperCase() : "", email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!token && (!regNo || !email)) return fail("Enter your registration number and email.");
  const [r] = await db.select().from(s.registrations).where(token ? eq(s.registrations.accessToken, token) : eq(s.registrations.regNo, regNo.replace(/-W\d+$/, "")));
  if (!r || (!token && r.email.toLowerCase() !== email)) return fail("We could not find a registration with these details.", 404);
  if (r.paymentStatus !== "PAID" && r.paymentStatus !== "WAIVED") return fail("This registration is not confirmed yet.", 403);
  const rows = await db.select({ i: s.registrationItems, w: s.sessions }).from(s.registrationItems).innerJoin(s.sessions, eq(s.sessions.id, s.registrationItems.sessionId))
    .where(and(eq(s.registrationItems.registrationId, r.id), eq(s.sessions.type, "WORKSHOP"), lte(s.sessions.startsAt, new Date())));
  const done = rows.length ? new Set((await db.select({ sid: s.feedback.sessionId }).from(s.feedback).where(and(eq(s.feedback.registrationId, r.id), inArray(s.feedback.sessionId, rows.map((x) => x.w.id))))).map((x) => x.sid)) : new Set();
  return ok({
    name: `${r.title} ${r.firstName} ${r.lastName}`, regNo: r.regNo,
    workshops: rows.map(({ w }) => ({ slug: w.slug, title: w.title, date: fmtDate(w.startsAt, { day: "numeric", month: "short", year: "numeric" }), done: done.has(w.id) })),
  });
}
