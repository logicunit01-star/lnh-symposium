import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!rateLimit("cert:" + ipOf(req), 10)) return fail("Too many attempts", 429);
  const p = z.object({ regNo: z.string().trim().toUpperCase(), email: z.string().trim().toLowerCase() }).safeParse(await req.json().catch(() => ({})));
  if (!p.success) return fail("Enter your registration number and email.");
  const [r] = await db.select({ t: s.registrations.accessToken, c: s.registrations.certificateNo }).from(s.registrations)
    .where(and(eq(s.registrations.regNo, p.data.regNo), sql`lower(${s.registrations.email}) = ${p.data.email}`));
  if (!r) return fail("No registration found with those details.", 404);
  if (!r.c) return fail("Your certificate has not been issued yet. Certificates are issued after the symposium.", 404);
  return ok({ url: `/api/certificates/${r.t}` });
}
