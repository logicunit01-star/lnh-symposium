import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { resendOtp } from "@/lib/otp";

/** Send a fresh code for a pending sign-up or look-up. */
export async function POST(req: Request) {
  if (!rateLimit("resend:" + ipOf(req), 6)) return fail("Too many attempts — please wait a minute.", 429);
  const { otpId } = await req.json().catch(() => ({}));
  const [row] = await db.select().from(s.otpCodes).where(eq(s.otpCodes.id, String(otpId || "")));
  if (!row) return fail("Start again.", 404);
  const to = row.purpose === "SIGNUP" ? { email: (row.payload as any)?.email, phone: (row.payload as any)?.phone } : { phone: row.target, email: (row.payload as any)?.email };
  const r = await resendOtp(row.id, to);
  if ("error" in r && r.error) return fail(r.error, 429);
  return ok({ sent: true, demoCode: r.demoCode });
}
