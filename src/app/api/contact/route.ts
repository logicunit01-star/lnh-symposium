import { z } from "zod";
import { sendTemplate } from "@/lib/email";
import { db, schema as s } from "@/lib/db";
import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { getEvent } from "@/lib/event";
import { sendEmail, emailLayout } from "@/lib/notify";

const schema = z.object({
  name: z.string().trim().min(2).max(100), email: z.string().trim().email(), phone: z.string().trim().max(20).optional().or(z.literal("")),
  subject: z.string().trim().min(2).max(150), message: z.string().trim().min(10).max(4000), website: z.string().max(0).optional(), // honeypot
});

export async function POST(req: Request) {
  if (!(await rateLimit("contact:" + ipOf(req), 5))) return fail("Too many requests, please try later.", 429);
  const p = schema.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  const { website, ...data } = p.data;
  await db.insert(s.contactMessages).values({ ...data, phone: data.phone || null });
  const ev = await getEvent();
  await sendTemplate("CONTACT_ENQUIRY", ev.contactEmail, { status: data.subject, enquiry_from: `${data.name} <${data.email}> ${data.phone ?? ""}`.trim(), message: data.message }, { ref: data.email, replyTo: data.email }); // Reply goes straight to the person who wrote
  return ok({ ok: true });
}
