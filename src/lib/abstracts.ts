import "server-only";
import { z } from "zod";
import { db, schema as s } from "./db";
import { nextNumber, pad } from "./counters";
import { getEvent, abstractWindow, editionYear } from "./event";
import { wordCount, fmtDate } from "./utils";
import { sendEmail, emailLayout, sendSms } from "./notify";

export const abstractInput = z.object({
  type: z.enum(["ORAL", "POSTER"]),
  title: z.string().min(1), gender: z.enum(["Male", "Female"]),
  firstName: z.string().trim().min(1).max(60), lastName: z.string().trim().min(1).max(60),
  profession: z.string().trim().max(80).optional().or(z.literal("")),
  organization: z.string().trim().min(2).max(160), department: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(60), country: z.string().trim().min(2).max(60),
  telephone: z.string().trim().max(20).optional().or(z.literal("")),
  mobile: z.string().trim().min(10).max(20), email: z.string().trim().toLowerCase().email(),
  qualification: z.string().trim().max(80).optional().or(z.literal("")),
  qualificationYear: z.coerce.number().int().min(1950).max(2100).optional().or(z.literal("").transform(() => undefined)),
  specialty: z.string().trim().min(2).max(80),
  authors: z.string().trim().min(2).max(1000), presentingAuthor: z.string().trim().min(2).max(120),
  abstractTitle: z.string().trim().min(5).max(250), body: z.string().trim().min(50),
  keywords: z.string().trim().max(250).optional().or(z.literal("")),
  declaration: z.literal(true, { errorMap: () => ({ message: "Please confirm the declaration" }) }),
});

export async function submitAbstract(input: z.infer<typeof abstractInput>) {
  const ev = await getEvent();
  const w = abstractWindow(ev);
  if (w !== "OPEN") throw new Error(w === "CLOSED" ? "Abstract submission is closed." : "Abstract submission has not opened yet.");
  const wc = wordCount(input.body);
  if (wc > ev.abstractWordLimit) throw Object.assign(new Error(`Abstract exceeds ${ev.abstractWordLimit} words (${wc}).`), { field: "body" });
  const yy = String(editionYear(ev)).slice(-2);
  const refNo = `ABS${yy}-${input.type === "ORAL" ? "O" : "P"}${pad(await nextNumber(`abs-${yy}`), 3)}`;
  const { declaration, ...data } = input;
  const [a] = await db.insert(s.abstracts).values({
    ...data, refNo, wordCount: wc, profession: data.profession || null, telephone: data.telephone || null,
    qualification: data.qualification || null, qualificationYear: (data.qualificationYear as number) || null, keywords: data.keywords || null,
  }).returning();
  await sendEmail(a.email, `${ev.name} — abstract received (${refNo})`, emailLayout("Abstract received",
    `<p>Dear ${a.title} ${a.firstName} ${a.lastName},</p><p>Your ${a.type === "ORAL" ? "scientific paper" : "poster"} abstract <b>“${a.abstractTitle}”</b> has been received with reference number <b>${refNo}</b>.</p>
     <p>The scientific committee will review all submissions after the deadline${ev.abstractDeadline ? ` (${fmtDate(ev.abstractDeadline)})` : ""}. You will be informed of the decision by email.</p>`)).catch(() => {});
  await sendSms(a.mobile, `LNH Symposium: Abstract ${refNo} received. Decision will be emailed to ${a.email}.`).catch(() => {});
  return a;
}
