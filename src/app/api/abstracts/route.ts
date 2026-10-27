import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { currentAccount } from "@/lib/account";
import { abstractInput, submitAbstract, titleTaken } from "@/lib/abstracts";

/** Submit an abstract (signed-in, email-verified account required). */
export async function POST(req: Request) {
  if (!rateLimit("abs:" + ipOf(req), 6)) return fail("Too many submissions — please wait a minute.", 429);
  const a = await currentAccount();
  if (!a) return fail("Please sign in with a verified account to submit an abstract.", 401);
  const p = abstractInput.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  try {
    const r = await submitAbstract(p.data, a.id);
    return ok({ refNo: r.refNo });
  } catch (e: any) {
    return fail(e.message, 400, e.field ? { [e.field]: e.message } : undefined);
  }
}

/** Live duplicate-title check. */
export async function GET(req: Request) {
  if (!rateLimit("absdup:" + ipOf(req), 60)) return fail("Slow down", 429);
  const t = new URL(req.url).searchParams.get("title") || "";
  if (t.trim().length < 10) return ok({ duplicate: null });
  return ok({ duplicate: await titleTaken(t) });
}
