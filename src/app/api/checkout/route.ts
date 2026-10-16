import { z } from "zod";
import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { currentAccount } from "@/lib/account";
import { createRegistration, CapacityError } from "@/lib/registration";

const input = z.object({
  categoryId: z.coerce.number().int().positive(),
  sessionIds: z.array(z.string()).max(30),
  includePass: z.boolean().default(true),
  paymentMethod: z.string().max(40).optional(),
});

/** Converts the visitor's cart into a registration (order) with a SYM-YYYY-NNNNN number. */
export async function POST(req: Request) {
  if (!rateLimit("checkout:" + ipOf(req), 20)) return fail("Too many attempts — please wait a minute.", 429);
  const a = await currentAccount();
  if (!a) return fail("Please sign in to continue.", 401);
  const p = input.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  if (!p.data.includePass && p.data.sessionIds.length === 0) return fail("Your cart is empty.");
  try {
    const r = await createRegistration({
      title: a.title, gender: a.gender as any, firstName: a.firstName, lastName: a.lastName, email: a.email, phone: a.phone,
      pmdcNo: a.pmdcNo ?? "", specialty: a.specialty ?? "", designation: a.designation ?? "", institution: a.institution,
      address: a.address ?? "", city: a.city ?? "", categoryId: p.data.categoryId, sessionIds: p.data.sessionIds, consent: true, includePass: p.data.includePass,
    }, { accountId: a.id });
    return ok({ regNo: r.regNo, accessToken: r.accessToken });
  } catch (e: any) {
    if (e instanceof CapacityError) return fail(e.message, 409);
    return fail(e?.message || "Checkout failed");
  }
}
