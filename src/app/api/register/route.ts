import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { createRegistration, registrationInput, CapacityError } from "@/lib/registration";

export async function POST(req: Request) {
  if (!rateLimit("reg:" + ipOf(req), 8)) return fail("Too many attempts — please wait a minute.", 429);
  const body = await req.json().catch(() => ({}));
  const p = registrationInput.safeParse(body);
  if (!p.success) return zodFail(p.error);
  try {
    const r = await createRegistration(p.data);
    return ok({ regNo: r.regNo, accessToken: r.accessToken });
  } catch (e: any) {
    if (e instanceof CapacityError) return fail(e.message, 409);
    console.error(e);
    return fail(e?.message || "Registration failed", 400);
  }
}
