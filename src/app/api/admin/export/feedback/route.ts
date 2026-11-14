import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";
import { WF_STATEMENTS } from "@/lib/workshop-feedback";

export async function GET() {
  if (!(await apiUser("feedback"))) return new Response("Forbidden", { status: 403 });
  const rows = await db.select({ Session: s.sessions.title, Day: s.sessions.day, Overall: s.feedback.overall, Content: s.feedback.content, Speaker: s.feedback.speaker, Relevance: s.feedback.relevance, Organization: s.feedback.organization, Recommend: s.feedback.recommend, Comments: s.feedback.comments, RegNo: s.feedback.regNo, At: s.feedback.createdAt, answers: s.feedback.answers, RecommendChoice: s.feedback.recommendChoice, Contact: s.feedback.contactOk })
    .from(s.feedback).innerJoin(s.sessions, eq(s.sessions.id, s.feedback.sessionId)).orderBy(asc(s.feedback.createdAt));
  // N7: one column per workshop-form statement (blank for other sessions)
  const out = rows.map(({ answers, ...r }) => ({ ...r, ...Object.fromEntries(WF_STATEMENTS.map((t, i) => [`Q${i + 1} ${t}`, answers?.[i] ?? ""])) }));
  return csvResponse(`feedback-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(out));
}
