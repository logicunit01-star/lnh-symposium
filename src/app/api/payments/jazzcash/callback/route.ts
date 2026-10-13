import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { settlePayment, jazzHash } from "@/lib/payments";
import { appUrl } from "@/lib/utils";

// JazzCash posts the result here (pp_ReturnURL). Verify the secure hash before trusting it.
export async function POST(req: Request) {
  const form = await req.formData();
  const fields: Record<string, string> = {};
  form.forEach((v, k) => (fields[k] = String(v)));
  const expected = jazzHash(fields, process.env.JAZZCASH_INTEGRITY_SALT || "");
  if (!fields.pp_SecureHash || expected !== fields.pp_SecureHash.toUpperCase()) return new Response("Invalid signature", { status: 400 });
  const okTxn = fields.pp_ResponseCode === "000";
  const pay = await settlePayment(fields.pp_TxnRefNo, okTxn, fields.pp_RetreivalReferenceNo || fields.pp_AuthCode, fields);
  const [r] = await db.select({ t: s.registrations.accessToken }).from(s.registrations).where(eq(s.registrations.id, pay.registrationId));
  return NextResponse.redirect(`${appUrl()}/register/success/${r.t}${okTxn ? "?paid=1" : "?failed=1"}`, 303);
}
