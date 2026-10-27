import { desc, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { verifyOtp } from "@/lib/otp";
import { fmtDate, fmtTime24 } from "@/lib/utils";

/** Code checked → the registrations made with that mobile number. */
export async function POST(req: Request) {
  if (!rateLimit("lookupv:" + ipOf(req), 20)) return fail("Too many attempts — please wait a minute.", 429);
  const { otpId, code } = await req.json().catch(() => ({}));
  if (!otpId || !/^\d{6}$/.test(String(code || "").trim())) return fail("Enter the 6-digit code.");
  const v = await verifyOtp(String(otpId), "LOOKUP", String(code));
  if ("error" in v) return fail(v.error!, 400);
  const digits = v.row.target;
  const regs = await db.query.registrations.findMany({
    where: sql`regexp_replace(${s.registrations.phone}, '[^0-9]', '', 'g') in (${digits}, ${"92" + digits.slice(1)})`,
    orderBy: [desc(s.registrations.createdAt)],
    with: { category: true, items: { with: { session: true } } },
  });
  return ok({
    registrations: regs.map((r) => ({
      regNo: r.regNo, name: `${r.title} ${r.firstName} ${r.lastName}`, status: r.paymentStatus, total: r.totalFee, category: r.category.label,
      passUrl: `/register/success/${r.accessToken}`, pdfUrl: `/api/registrations/${r.accessToken}/pdf`,
      items: r.items.map((i) => ({ title: i.session.title, when: `${fmtDate(i.session.startsAt, { weekday: "short", day: "numeric", month: "short" })} · ${fmtTime24(i.session.startsAt)}`, venue: i.session.hall })),
    })),
  });
}
