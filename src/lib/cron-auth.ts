import crypto from "node:crypto";

/** Scheduled jobs: header "Authorization: Bearer <CRON_SECRET>" only (audit 16 Nov 2026: no ?key= in the address, which
 *  ends up in server logs), compared in constant time. Vercel Cron sends this header itself. */
export function cronOk(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!secret || !got) return false;
  const a = Buffer.from(secret), b = Buffer.from(got);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
