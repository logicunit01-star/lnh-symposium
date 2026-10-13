import { asc } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET() {
  if (!(await apiUser("abstracts"))) return new Response("Forbidden", { status: 403 });
  const rows = await db.select().from(s.abstracts).orderBy(asc(s.abstracts.createdAt));
  return csvResponse(`abstracts-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows.map(({ id, reviewerId, ...r }) => r)));
}
