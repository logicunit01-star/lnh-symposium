import { eq, sql } from "drizzle-orm";
import { db as defaultDb, schema as s } from "./db";
import { DEFAULT_TEMPLATES, type TemplateKey } from "./email-templates";

type DB = typeof defaultDb;
const HOST = "symposium2027.lnh.edu.pk";

/**
 * The five LNH symposium mailboxes (16 Nov 2026) and which notifications each one sends. Created switched off and
 * without a password: the Super Admin enters each password in Admin → Email settings, which switches it on.
 * Runs on every database setup but only creates what is missing, and assigns notifications only to a mailbox it
 * has just created (so later changes in the admin are never overwritten).
 */
export const MAILBOXES: { address: string; label: string; fromName: string; replyTo?: string; isDefault?: boolean; sends: TemplateKey[] }[] = [
  { address: "registration@symposium2027.lnh.edu.pk", label: "Registration", fromName: "Registration, 9th LNH Symposium",
    sends: ["REGISTRATION_RECEIVED", "REGISTRATION_CONFIRMED", "PAYMENT_PENDING", "SEAT_HOLD_EXPIRED", "SYMPOSIUM_REMINDER", "GUEST_RECEIVED", "GUEST_NOT_APPROVED", "CERTIFICATE_READY", "BROADCAST"] },
  { address: "workshop@symposium2027.lnh.edu.pk", label: "Workshops", fromName: "Workshops, 9th LNH Symposium",
    sends: ["WORKSHOP_CONFIRMED", "WORKSHOP_REMINDER", "WORKSHOP_CANCELLED", "WAITLIST_SEAT_FREE", "WORKSHOP_REQUEST_APPROVED", "WORKSHOP_REQUEST_REJECTED", "WORKSHOP_FLYER_APPROVED", "WORKSHOP_CERTIFICATE"] },
  { address: "poster@symposium2027.lnh.edu.pk", label: "Posters", fromName: "Posters Committee, 9th LNH Symposium", sends: ["ABSTRACT_ACCEPTED_POSTER"] },
  { address: "feedback@symposium2027.lnh.edu.pk", label: "Feedback", fromName: "9th LNH Symposium", sends: ["WORKSHOP_FEEDBACK_REQUEST", "CONTACT_ENQUIRY"] },
  // default for everything not assigned above; replies go to the registration desk (a notifications@ inbox is usually not read)
  { address: "notifications@symposium2027.lnh.edu.pk", label: "Notifications (default)", fromName: "9th LNH Symposium", replyTo: "registration@symposium2027.lnh.edu.pk", isDefault: true,
    sends: ["SIGN_IN_CODE", "AGENDA_SUBMITTED", "AGENDA_APPROVED", "SESSION_FLYER_READY", "SESSION_DETAILS_REQUEST", "GUEST_TO_APPROVE", "INVITE_SPEAKER", "INVITE_CHAIR", "INVITE_REMINDER", "ABSTRACT_RECEIVED", "ABSTRACT_ACCEPTED", "ABSTRACT_REJECTED"] },
];

export async function seedMailboxes(db: DB = defaultDb) {
  const created: string[] = [];
  const hasDefault = (await db.select({ id: s.mailAccounts.id }).from(s.mailAccounts).where(eq(s.mailAccounts.isDefault, true))).length > 0;
  for (const m of MAILBOXES) {
    const [found] = await db.select({ id: s.mailAccounts.id }).from(s.mailAccounts).where(sql`lower(${s.mailAccounts.username}) = ${m.address}`);
    if (found) continue; // already set up (perhaps with its password): leave it and its notifications alone
    const [acc] = await db.insert(s.mailAccounts).values({
      label: m.label, host: HOST, port: 465, security: "SSL", username: m.address, secret: null, fromName: m.fromName, fromAddress: m.address,
      replyTo: m.replyTo ?? null, isDefault: !!m.isDefault && !hasDefault, active: false, updatedBy: "Setup (16 Nov 2026)",
    }).returning({ id: s.mailAccounts.id });
    created.push(m.address);
    for (const key of m.sends) {
      const t = DEFAULT_TEMPLATES[key];
      if (!t) continue;
      const [row] = await db.select({ accountId: s.emailTemplates.accountId }).from(s.emailTemplates).where(eq(s.emailTemplates.key, key));
      if (!row) await db.insert(s.emailTemplates).values({ key, subject: t.subject, body: t.body, buttonLabel: t.buttonLabel ?? null, accountId: acc.id, updatedBy: "Setup (16 Nov 2026)" });
      else if (!row.accountId) await db.update(s.emailTemplates).set({ accountId: acc.id }).where(eq(s.emailTemplates.key, key));
    }
  }
  return created;
}
