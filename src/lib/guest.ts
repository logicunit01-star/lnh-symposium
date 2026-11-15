import "server-only";
import { sendTemplate } from "./email";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema as s } from "./db";
import { getEvent, editionYear } from "./event";
import { nextNumber, pad } from "./counters";
import { appUrl, randomToken } from "./utils";
import { basicInfo, sendRegistrationNotice } from "./registration";
import { GUEST_ROLES, normaliseCnic } from "./reg-fields";
import { deptPeople } from "./dept-notify";
import { isListedDepartment } from "./departments";

/** Guests Registration Form 2027 (speaker, chairperson, moderator, panelist; HOD sign-off) and Volunteers Registration Form 2027
 *  (Chairperson Facilitation Committee sign-off). Both are free and need approval before the pass is valid. */
export const guestInput = z.intersection(basicInfo, z.object({
  regType: z.literal("GUEST"),
  guestRole: z.enum(["INVITED_SPEAKER", "CHAIRPERSON", "MODERATOR", "PANELIST"], { errorMap: () => ({ message: "Choose a category" }) }),
  guestSession: z.string().trim().min(3, "Required").max(200),
  department: z.string().trim().min(2, "Choose the department").max(120), // checked against the department list in createGuest
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
  if (input.regType === "GUEST" && !(await isListedDepartment(input.department))) throw new Error("Choose the department from the list.");
  const year = String(editionYear(ev)), prefix = (ev.regPrefix || "SYM").toUpperCase();
  const regNo = `${prefix}-${year}-${pad(await nextNumber(`reg-${prefix}-${year}`), 5)}`;
  const [r] = await db.insert(s.registrations).values({
    regNo, accessToken: randomToken(), regType: input.regType, title: input.title, gender: input.gender, firstName: input.firstName, lastName: input.lastName,
    email: input.email, phone: input.phone, whatsapp: input.whatsapp || null, address: input.address, country: input.country || "Pakistan", province: input.province || null, city: input.city,
    cnic: normaliseCnic(input.cnic, input.country), pmdcNo: input.pmdcNo || null, qualification: input.qualification || null, institution: input.institution,
    categoryId: cat.id, hasPass: true, conferenceFee: 0, totalFee: 0, paymentStatus: "WAIVED", paymentMethod: "Complimentary", approvalStatus: "PENDING",
    department: input.regType === "GUEST" ? input.department : null, volunteerDepartment: input.regType === "VOLUNTEER" ? input.department : null, guestRole: input.regType === "GUEST" ? input.guestRole : null, guestSession: input.regType === "GUEST" ? input.guestSession : null,
    academicYear: input.regType === "VOLUNTEER" ? input.academicYear : null,
  }).returning();
  const what = input.regType === "GUEST" ? `as ${GUEST_ROLES[input.guestRole]} (${input.guestSession})` : "as a volunteer";
  const approver = input.regType === "GUEST" ? `the Head of the ${input.department} department` : "the Chairperson, Facilitation Committee";
  await sendTemplate("GUEST_RECEIVED", r.email, { name: `${r.title} ${r.firstName} ${r.lastName}`, role: what, reg_no: regNo, approver, link: `${appUrl()}/register/success/${r.accessToken}` }, { ref: regNo }).catch(() => {});
  // tell the approvers
  const approvers = input.regType === "GUEST"
    ? await deptPeople(input.department, "dept.guests")
    : await db.select({ email: s.users.email, name: s.users.name }).from(s.users).where(and(eq(s.users.role, "FACILITATION_CHAIR"), eq(s.users.active, true)));
  for (const a of approvers) await sendTemplate("GUEST_TO_APPROVE", a.email, {
    name: a.name, author_name: `${r.title} ${r.firstName} ${r.lastName}`, institution: r.institution, role: what, reg_no: regNo,
    registration_type: input.regType === "GUEST" ? "guest" : "volunteer", link: `${appUrl()}${input.regType === "GUEST" ? "/admin/dept/guests" : "/admin/volunteers"}`,
  }, { ref: regNo }).catch(() => {});
  return r;
}

/** HOD (guests) or Chairperson Facilitation Committee (volunteers) approves or declines. */
export async function decideGuest(id: string, approve: boolean, actor: string, note: string | null) {
  const [r] = await db.update(s.registrations).set({ approvalStatus: approve ? "APPROVED" : "REJECTED", approvedBy: actor, approvedAt: new Date(), approvalNote: note }).where(eq(s.registrations.id, id)).returning();
  if (!r) return;
  if (approve) await sendRegistrationNotice(r.id, "paid").catch(() => {});
  else {
    const ev = await getEvent();
    await sendTemplate("GUEST_NOT_APPROVED", r.email, { name: `${r.title} ${r.firstName} ${r.lastName}`, registration_type: r.regType === "GUEST" ? "guest" : "volunteer", reg_no: r.regNo, note, contact_email: ev.contactEmail }, { ref: r.regNo }).catch(() => {});
  }
}
