import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { checkPayPro } from "@/lib/payments";
import { appUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";
// The customer comes back from Click2Pay here (?txn=<our order number>&ordId=<PayProId>&status=&msg=).
// The status in the address is not trusted: the order status is asked from PayPro.
export async function GET(req: Request) {
  const u = new URL(req.url), txn = u.searchParams.get("txn") || "";
  const pay = txn ? await db.query.payments.findFirst({ where: eq(s.payments.txnRef, txn) }) : null;
  if (!pay) return NextResponse.redirect(`${appUrl()}/`, 303);
  const [r] = await db.select({ t: s.registrations.accessToken }).from(s.registrations).where(eq(s.registrations.id, pay.registrationId));
  let q = "?pending=1";
  try {
    const c = await checkPayPro(txn);
    if (c?.paid) q = "?paid=1";
    else if ((u.searchParams.get("status") || "").toLowerCase() === "failure") q = "?failed=1";
  } catch (e) { console.error("PayPro return check", e); }
  return NextResponse.redirect(`${appUrl()}/register/success/${r.t}${q}`, 303);
}
