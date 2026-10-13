import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "@/lib/db";
import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";

const r = z.coerce.number().int().min(1).max(5);
const schema = z.object({ overall: r, content: r, speaker: r, organization: r, relevance: r, recommend: z.boolean(), comments: z.string().max(2000).optional(), regNo: z.string().max(20).optional() });

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  if (!rateLimit(`fb:${params.slug}:${ipOf(req)}`, 3, 10 * 60_000)) return fail("You have already submitted feedback for this session.", 429);
  const [sess] = await db.select().from(s.sessions).where(eq(s.sessions.slug, params.slug));
  if (!sess || !sess.feedbackOpen) return fail("Feedback is not open for this session.", 404);
  const p = schema.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  await db.insert(s.feedback).values({ ...p.data, sessionId: sess.id, comments: p.data.comments || null, regNo: p.data.regNo?.toUpperCase() || null });
  return ok({ ok: true });
}
