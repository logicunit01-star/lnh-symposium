import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "./db";
import { getEvent, editionYear } from "./event";
import { nextNumber, pad } from "./counters";
import { appUrl, randomToken } from "./utils";
import { sendEmail, emailLayout } from "./notify";
import { basicInfo, sendRegistrationNotice } from "./registration";
import { GUEST_ROLES, normaliseCnic } from "./reg-fields";
import { DEPARTMENTS } from "./scientific";

/** Guests Registration Form 2027 (speaker, chairperson, moderator, panelist; HOD sign-off) and Volunteers Registration Form 2027
 *  (Chairperson Facilitation Committee sign-off). Both are free and need approval before the pass is valid. */
export const guestInput = z.intersection(basicInfo, z.object({
  regType: z.literal("GUEST"),
  guestRole: z.enum(["INVITED_SPEAKER", "CHAIRPERSON", "MODERATOR", "PANELIST"], { errorMap: () => ({ message: "Choose a category" }) }),
  guestSession: z.string().trim().min(3, "Required").max(200),
  department: z.string().refine((v) => DEPARTMENTS.includes(v), "Choose the department"),
}));
export const volunteerInput = z.intersection(basicInfo, z.object({
  regType: z.literal("VOLUNTEER"),
  department: z.string().trim().min(2, "Required").max(120),
  academicYear: z.string().trim().min(1, "Required").max(40),
}));

export async function createGuestRegistration(input: z.infer<typeof guestInput> | z.infer<typeof volunteerInput>) {
  const ev = await getEvent();
  const code = input.regType === "GUEST" ? "GUEST" : "VOLUNTEER";
  const [cat] = await db.select().from(s.feeCategory).where(eq(s.feeCategory.code, code));
  if (!cat) throw new Error("Guest and volunteer registration is not set up. Run the database update.");
  const [dup] = await db.select({ regNo: s.registrations.regNo }).from(s.registrations).where(and(eq(s.registrations.email, input.email), eq(s.registrations.regType, input.regType)));
  if (dup) throw new Error(`This email is already registered as a ${input.regType === "GUEST" ? "guest" : "volunteer"} (${dup.regNo}).`);
  const year = String(editionYear(ev)), prefix = (ev.regPrefix || "SYM").toUpperCase();
  const regNo = `${prefix}-${year}-${pad(await nextNumber(`reg-${prefix}-${year}`), 5)}`;
  const [r] = await db.insert(s.registrations).values({
    regNo, accessToken: randomToken(), regType: input.regType, title: input.title, gender: input.gender, firstName: input.firstName, lastName: input.lastName,
    email: input.email, phone: input.phone, whatsapp: input.whatsapp || null, address: input.address, country: input.country || "Pakistan", province: input.province || null, city: input.city,
    cnic: normaliseCnic(input.cnic, input.country), pmdcNo: input.pmdcNo || null, qualification: input.qualification || null, institution: input.institution,
    categoryId: cat.id, conferenceFee: 0, totalFee: 0, paymentStatus: "WAIVED", paymentMethod: "Complimentary", approvalStatus: "PENDING",
    department: input.department, guestRole: input.regType === "GUEST" ? input.guestRole : null, guestSession: input.regType === "GUEST" ? input.guestSession : null,
    academicYear: input.regType === "VOLUNTEER" ? input.academicYear : null,
  }).returning();
  const what = input.regType === "GUEST" ? `as ${GUEST_ROLES[input.guestRole]} (${input.guestSession})` : "as a volunteer";
  const approver = input.regType === "GUEST" ? `the Head of the ${input.department} department` : "the Chairperson, Facilitation Committee";
  await sendEmail(r.email, `${ev.name}: registration received (${regNo})`, emailLayout("Registration received",
    `<p>Dear ${r.title} ${r.firstName} ${r.lastName},</p><p>Your registration ${what} has been received. Registration number: <b>${regNo}</b>.</p><p>It will be confirmed after approval by ${approver}. Your pass and QR code are emailed once approved.</p>`,
    { label: "View your registration", href: `${appUrl()}/register/success/${r.accessToken}` }), [], { ref: regNo }).catch(() => {});
  // tell the approvers
  const approvers = input.regType === "GUEST"
    ? await db.select({ email: s.users.email, name: s.users.name }).from(s.users).where(and(eq(s.users.role, "HOD"), eq(s.users.department, input.department), eq(s.users.active, true)))
    : await db.select({ email: s.users.email, name: s.users.name }).from(s.users).where(and(eq(s.users.role, "FACILITATION_CHAIR"), eq(s.users.active, true)));
  for (const a of approvers) await sendEmail(a.email, `${ev.name}: ${input.regType === "GUEST" ? "guest" : "volunteer"} registration to approve (${regNo})`, emailLayout("Registration awaiting your approval",
    `<p>Dear ${a.name},</p><p>${r.title} ${r.firstName} ${r.lastName} (${r.institution}) has registered ${what}.</p><p>Please approve or decline in the portal.</p>`,
    { label: "Review", href: `${appUrl()}${input.regType === "GUEST" ? "/admin/dept/guests" : "/admin/volunteers"}` }), [], { ref: regNo }).catch(() => {});
  return r;
}

/** HOD (guests) or Chairperson Facilitation Committee (volunteers) approves or declines. */
export async function decideGuest(id: string, approve: boolean, actor: string, note: string | null) {
  const [r] = await db.update(s.registrations).set({ approvalStatus: approve ? "APPROVED" : "REJECTED", approvedBy: actor, approvedAt: new Date(), approvalNote: note }).where(eq(s.registrations.id, id)).returning();
  if (!r) return;
  if (approve) await sendRegistrationNotice(r.id, "paid").catch(() => {});
  else {
    const ev = await getEvent();
    await sendEmail(r.email, `${ev.name}: registration ${r.regNo}`, emailLayout("Registration not approved",
      `<p>Dear ${r.title} ${r.firstName} ${r.lastName},</p><p>Your ${r.regType === "GUEST" ? "guest" : "volunteer"} registration <b>${r.regNo}</b> could not be approved.${note ? ` Note: ${note.replace(/</g, "&lt;")}` : ""}</p><p>For questions, contact ${ev.contactEmail}.</p>`), [], { ref: r.regNo }).catch(() => {});
  }
}
