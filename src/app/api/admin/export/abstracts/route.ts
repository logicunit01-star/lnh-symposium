import { asc } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  if (!(await apiUser("abstracts"))) return new Response("Forbidden", { status: 403 });
  const rows = await db.select().from(s.abstracts).orderBy(asc(s.abstracts.createdAt));
  return csvResponse(`abstracts-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows.map((a) => ({
    id: a.refNo, submitted: a.createdAt.toISOString(), preferred: a.presentationPref ?? a.type, kind: a.kind, speciality: a.specialty, reviewingDept: a.assignedDept, phase: a.phase,
    title: a.abstractTitle, presentingAuthor: a.presentingAuthor, designation: a.designation, organization: a.organization, department: a.department, city: a.city, country: a.country,
    email: a.email, contact: a.mobile, coAuthors: (a.coAuthors ?? []).map((c) => `${c.name} (${c.affiliation})`).join("; "), keywords: a.keywords, words: a.wordCount,
    deptDecision: a.hodDecision, deptScore: a.hodTotal, deptNotes: a.hodNotes, status: a.status, acceptedAs: a.acceptedAs, scNotes: a.scNotes, abstract: a.body,
  }))));
}
