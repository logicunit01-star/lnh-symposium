import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  if (!(await apiUser("feedback"))) return new Response("Forbidden", { status: 403 });
  const rows = await db.select({ Session: s.sessions.title, Day: s.sessions.day, Overall: s.feedback.overall, Content: s.feedback.content, Speaker: s.feedback.speaker, Relevance: s.feedback.relevance, Organization: s.feedback.organization, Recommend: s.feedback.recommend, Comments: s.feedback.comments, RegNo: s.feedback.regNo, At: s.feedback.createdAt })
    .from(s.feedback).innerJoin(s.sessions, eq(s.sessions.id, s.feedback.sessionId)).orderBy(asc(s.feedback.createdAt));
  return csvResponse(`feedback-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
}
