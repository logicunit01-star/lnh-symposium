import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema as s } from "./db";

export async function feedbackStats(sessionId: string) {
  const [agg] = await db.select({
    n: sql<number>`count(*)::int`,
    overall: sql<number>`coalesce(round(avg(overall)::numeric,2),0)::float`,
    content: sql<number>`coalesce(round(avg(content)::numeric,2),0)::float`,
    speaker: sql<number>`coalesce(round(avg(speaker)::numeric,2),0)::float`,
    relevance: sql<number>`coalesce(round(avg(relevance)::numeric,2),0)::float`,
    organization: sql<number>`coalesce(round(avg(organization)::numeric,2),0)::float`,
    recommend: sql<number>`coalesce(round(100.0*avg(case when recommend then 1 else 0 end)),0)::int`,
  }).from(s.feedback).where(eq(s.feedback.sessionId, sessionId));
  const dist = await db.select({ k: s.feedback.overall, n: sql<number>`count(*)::int` }).from(s.feedback).where(eq(s.feedback.sessionId, sessionId)).groupBy(s.feedback.overall);
  const comments = await db.select({ c: s.feedback.comments, o: s.feedback.overall, t: s.feedback.createdAt }).from(s.feedback)
    .where(sql`${s.feedback.sessionId} = ${sessionId} and ${s.feedback.comments} is not null and ${s.feedback.comments} <> ''`).orderBy(desc(s.feedback.createdAt)).limit(20);
  return { ...agg, dist: [1, 2, 3, 4, 5].map((k) => dist.find((d) => d.k === k)?.n ?? 0), comments, at: new Date().toISOString() };
}
export type FeedbackStats = Awaited<ReturnType<typeof feedbackStats>>;
