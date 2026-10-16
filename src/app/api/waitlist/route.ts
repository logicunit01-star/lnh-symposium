import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { currentAccount } from "@/lib/account";

const input = z.object({ sessionId: z.string().min(1).max(64) });

/** Join the waitlist of a full, approved workshop (signed-in visitors). */
export async function POST(req: Request) {
  if (!rateLimit("waitlist:" + ipOf(req), 20)) return fail("Too many attempts — please wait a minute.", 429);
  const a = await currentAccount();
  if (!a) return fail("Please sign in to join the waitlist.", 401);
  const p = input.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  const [w] = await db.select().from(s.sessions).where(and(eq(s.sessions.id, p.data.sessionId), eq(s.sessions.status, "APPROVED")));
  if (!w || !w.registrable) return fail("Workshop not found.", 404);
  await db.insert(s.waitlist).values({ sessionId: w.id, accountId: a.id, name: `${a.title} ${a.firstName} ${a.lastName}`, email: a.email, phone: a.phone }).onConflictDoNothing();
  const [{ pos }] = await db.select({ pos: sql<number>`count(*)::int` }).from(s.waitlist)
    .where(and(eq(s.waitlist.sessionId, w.id), sql`${s.waitlist.createdAt} <= (select created_at from waitlist where session_id = ${w.id} and email = ${a.email})`));
  return ok({ position: pos });
}
