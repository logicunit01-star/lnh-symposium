import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { settlePayment, provider } from "@/lib/payments";
import { appUrl } from "@/lib/utils";

// Mock gateway callback — only active when PAYMENT_PROVIDER=mock.
export async function POST(req: Request) {
  if (provider() !== "mock") return new Response("Disabled", { status: 404 });
  const form = await req.formData();
  const txn = String(form.get("txn")); const approve = form.get("result") === "approve";
  const pay = await settlePayment(txn, approve, `MOCK-${Date.now()}`, { mock: true });
  const [r] = await db.select({ t: s.registrations.accessToken }).from(s.registrations).where(eq(s.registrations.id, pay.registrationId));
  return NextResponse.redirect(`${appUrl()}/register/success/${r.t}${approve ? "?paid=1" : "?failed=1"}`, 303);
}
