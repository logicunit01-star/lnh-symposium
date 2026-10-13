import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { ok, fail } from "@/lib/api";
import { startCheckout } from "@/lib/payments";

export async function POST(_: Request, { params }: { params: { token: string } }) {
  const [r] = await db.select({ id: s.registrations.id }).from(s.registrations).where(eq(s.registrations.accessToken, params.token));
  if (!r) return fail("Not found", 404);
  try { return ok(await startCheckout(r.id)); } catch (e: any) { return fail(e.message || "Payment error"); }
}
