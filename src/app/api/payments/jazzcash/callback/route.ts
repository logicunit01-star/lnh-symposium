import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import crypto from "node:crypto";
import { provider, settlePayment, jazzHash } from "@/lib/payments";
import { appUrl } from "@/lib/utils";

// JazzCash posts the result here (pp_ReturnURL). Verify the secure hash before trusting it.
export async function POST(req: Request) {
  // audit 16 Nov 2026: only while JazzCash is the active provider and its integrity salt is set (an empty salt made the hash forgeable)
  const salt = process.env.JAZZCASH_INTEGRITY_SALT || "";
  if ((await provider()) !== "jazzcash" || !salt) return new Response("Disabled", { status: 404 });
  const form = await req.formData();
  const fields: Record<string, string> = {};
  form.forEach((v, k) => (fields[k] = String(v)));
  const expected = Buffer.from(jazzHash(fields, salt)), got = Buffer.from(String(fields.pp_SecureHash || "").toUpperCase());
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return new Response("Invalid signature", { status: 400 });
  const okTxn = fields.pp_ResponseCode === "000";
  const pay = await settlePayment(fields.pp_TxnRefNo, okTxn, fields.pp_RetreivalReferenceNo || fields.pp_AuthCode, fields, "jazzcash").catch(() => null);
  if (!pay) return new Response("Unknown transaction", { status: 404 });
  const [r] = await db.select({ t: s.registrations.accessToken }).from(s.registrations).where(eq(s.registrations.id, pay.registrationId));
  return NextResponse.redirect(`${appUrl()}/register/success/${r.t}${okTxn ? "?paid=1" : "?failed=1"}`, 303);
}
