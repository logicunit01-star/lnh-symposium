import { z } from "zod";
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
  if (!rateLimit("contact:" + ipOf(req), 5)) return fail("Too many requests, please try later.", 429);
  const p = schema.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  const { website, ...data } = p.data;
  await db.insert(s.contactMessages).values({ ...data, phone: data.phone || null });
  const ev = await getEvent();
  await sendEmail(ev.contactEmail, `[Website enquiry] ${data.subject}`, emailLayout("New website enquiry",
    `<p><b>${data.name}</b> &lt;${data.email}&gt; ${data.phone ?? ""}</p><p>${data.message.replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p>`));
  return ok({ ok: true });
}
