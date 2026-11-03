import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { ok, fail, zodFail } from "@/lib/api";
import { rateLimit, ipOf } from "@/lib/ratelimit";
import { currentAccount } from "@/lib/account";
import { createRegistration, registrationInput, CapacityError } from "@/lib/registration";
import { normaliseCnic } from "@/lib/reg-fields";

const input = z.object({
  categoryId: z.coerce.number().int().positive(),
  designation: z.string().trim().max(80),
  sessionIds: z.array(z.string()).max(30),
  includePass: z.boolean().default(true),
  banquetQty: z.coerce.number().int().min(0).max(10).default(0),
  paymentMethod: z.string().max(40).optional(),
  // Registration Forms 2027: details not collected at sign-up by older accounts
  details: z.object({
    whatsapp: z.string().max(20).default(""), cnic: z.string().max(25).default(""), address: z.string().max(250).default(""), city: z.string().max(60).default(""),
    province: z.string().max(60).default(""), country: z.string().max(60).default("Pakistan"), qualification: z.string().max(120).default(""), employeeNo: z.string().max(20).default(""),
    pmdcNo: z.string().max(30).default(""),
  }),
});

/** Converts the visitor's cart into a registration (order) with a SYM-YYYY-NNNNN number. */
export async function POST(req: Request) {
  if (!rateLimit("checkout:" + ipOf(req), 20)) return fail("Too many attempts — please wait a minute.", 429);
  const a = await currentAccount();
  if (!a) return fail("Please sign in to continue.", 401);
  const p = input.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return zodFail(p.error);
  if (!p.data.includePass && p.data.sessionIds.length === 0) return fail("Your cart is empty.");
  const d = p.data.details;
  const reg = registrationInput.safeParse({
    title: a.title, gender: a.gender, firstName: a.firstName, lastName: a.lastName, email: a.email, phone: a.phone,
    whatsapp: d.whatsapp, cnic: d.cnic, address: d.address, city: d.city, province: d.province, country: d.country || "Pakistan", qualification: d.qualification,
    pmdcNo: d.pmdcNo || a.pmdcNo || "", specialty: a.specialty ?? "", designation: p.data.designation, employeeNo: d.employeeNo, institution: a.institution,
    categoryId: p.data.categoryId, sessionIds: p.data.sessionIds, consent: true, includePass: p.data.includePass, banquetQty: p.data.banquetQty,
  });
  if (!reg.success) return zodFail(reg.error);
  // Keep the account's details current for the next booking
  await db.update(s.accounts).set({
    whatsapp: d.whatsapp || null, cnic: normaliseCnic(d.cnic, d.country), address: d.address, city: d.city, province: d.province || null, country: d.country || "Pakistan",
    qualification: d.qualification || null, employeeNo: d.employeeNo || null, pmdcNo: d.pmdcNo || a.pmdcNo,
  }).where(eq(s.accounts.id, a.id));
  try {
    const r = await createRegistration(reg.data, { accountId: a.id });
    return ok({ regNo: r.regNo, accessToken: r.accessToken });
  } catch (e: any) {
    if (e instanceof CapacityError) return fail(e.message, 409);
    return fail(e?.message || "Checkout failed");
  }
}
