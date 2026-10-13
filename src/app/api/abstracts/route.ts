import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { abstractInput, submitAbstract } from "@/lib/abstracts";

export async function POST(req: Request) {
  if (!rateLimit("abs:" + ipOf(req), 6)) return fail("Too many submissions — please wait a minute.", 429);
  const p = abstractInput.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  try {
    const a = await submitAbstract(p.data);
    return ok({ refNo: a.refNo });
  } catch (e: any) {
    return fail(e.message, 400, e.field ? { [e.field]: e.message } : undefined);
  }
}
