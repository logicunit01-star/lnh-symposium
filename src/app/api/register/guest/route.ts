import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { getEvent } from "@/lib/event";
import { createGuestRegistration, guestInput, volunteerInput } from "@/lib/guest";
import { guestCodeOk } from "@/lib/guest-access";

/** Guests and volunteers registration forms 2027 (public, approval required). */
export async function POST(req: Request) {
  if (!rateLimit("guest:" + ipOf(req), 8)) return fail("Too many attempts — please wait a minute.", 429);
  const ev = await getEvent();
  if (!ev.registrationOpen) return fail("Registration is currently closed.");
  const body = await req.json().catch(() => ({}));
  if (!guestCodeOk(ev, body?.code)) return fail("This registration form is by invitation only. Please use the link you received.", 403);
  const p = (body?.regType === "VOLUNTEER" ? volunteerInput : guestInput).safeParse(body);
  if (!p.success) return zodFail(p.error);
  try {
    const r = await createGuestRegistration(p.data);
    return ok({ regNo: r.regNo, accessToken: r.accessToken });
  } catch (e: any) { return fail(e?.message || "Registration failed"); }
}
