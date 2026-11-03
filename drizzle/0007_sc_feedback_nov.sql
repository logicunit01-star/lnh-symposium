-- Scientific Committee feedback (29 Oct 2026), registration forms 2027, colour codes and flyer comments (received 1 Nov 2026)
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'FACILITATION_CHAIR';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"run_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'SCHEDULED' NOT NULL,
	"note" text,
	"created_by" text,
	"ran_at" timestamp with time zone,
	"result" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_templates" (
	"key" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"button_label" text,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "whatsapp" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "cnic" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "country" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "province" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "qualification" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "employee_no" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "qc_guidelines" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "banquet_fee" integer DEFAULT 4000 NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "banquet_max" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "email_from" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "email_cc" text;--> statement-breakpoint
ALTER TABLE "fee_category" ADD COLUMN IF NOT EXISTS "designations" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "cc" text;--> statement-breakpoint
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "sender" text;--> statement-breakpoint
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "template_key" text;--> statement-breakpoint
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "ref" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "whatsapp" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "cnic" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "country" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "province" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "qualification" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "banquet_qty" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "banquet_fee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "reg_type" text DEFAULT 'PARTICIPANT' NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "guest_role" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "guest_session" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "department" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "academic_year" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "approval_status" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "approved_by" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "approved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "approval_note" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "original_agenda" jsonb;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "original_submitted_at" timestamp with time zone;--> statement-breakpoint
-- Registration Forms 2027: four fee tiers (early bird / regular) replace the old categories
UPDATE "fee_category" SET "active" = false WHERE "code" NOT IN ('T1', 'T2', 'T3', 'T4', 'GUEST', 'VOLUNTEER');--> statement-breakpoint
INSERT INTO "fee_category" ("code", "label", "fee", "early_fee", "order", "tier", "active", "designations", "note") VALUES
 ('T1', 'Undergraduates, students, house officers, medical officers, nurses, technicians, hospital staff, physiotherapists, pharmacists', 1500, 1050, 1, 'GENERAL', true, '["Undergraduate","House Officer","Medical Officer","Student","Nurse","Technician","Hospital Staff","Physiotherapist","Pharmacist"]'::jsonb, NULL),
 ('T2', 'Postgraduates, residents, assistant managers', 2500, 2000, 2, 'GENERAL', true, '["Post Graduate","Resident","Asst. Manager"]'::jsonb, NULL),
 ('T3', 'Senior registrars, fellows, deputy managers', 3500, 3000, 3, 'GENERAL', true, '["Senior Registrar","Fellow","Deputy Manager"]'::jsonb, NULL),
 ('T4', 'Faculty, consultants, managers, heads of department, general practitioners', 6000, 5000, 4, 'GENERAL', true, '["Faculty","Consultant","Manager","Head of Department","General Practitioner"]'::jsonb, NULL),
 ('GUEST', 'Guest (invited speaker, chairperson, moderator, panelist)', 0, 0, 90, 'GENERAL', false, '[]'::jsonb, 'Guests registration form; approved by the HOD'),
 ('VOLUNTEER', 'Volunteer', 0, 0, 91, 'GENERAL', false, '[]'::jsonb, 'Volunteers registration form; approved by the Chairperson, Facilitation Committee')
ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint
-- SC feedback: abstract submission opens 15 Nov 2026 and closes 15 Dec 2026
UPDATE "event" SET "abstract_open" = '2026-11-15T00:00:00+05:00', "abstract_deadline" = '2026-12-15T23:59:59+05:00';--> statement-breakpoint
-- Review windows and agenda lock fitted to decisions and invitations on 31 Dec (only where the old defaults are still set)
UPDATE "event" SET "abstract_p1_open" = '2026-11-15T00:00:00+05:00', "abstract_p1_close" = '2026-12-22T23:59:59+05:00' WHERE "abstract_p1_open" = '2026-10-20T00:00:00+05:00';--> statement-breakpoint
UPDATE "event" SET "abstract_p2_open" = '2026-12-23T00:00:00+05:00', "abstract_p2_close" = '2026-12-27T23:59:59+05:00' WHERE "abstract_p2_open" = '2026-12-15T00:00:00+05:00';--> statement-breakpoint
UPDATE "event" SET "sci_lock_at" = '2026-12-29T23:59:59+05:00' WHERE "sci_lock_at" = '2027-01-10T23:59:59+05:00';--> statement-breakpoint
-- Scientific Committee mailbox as sender (edit in Event Settings)
UPDATE "event" SET "email_from" = 'Scientific Committee, 9th LNH Symposium <' || "contact_email" || '>' WHERE "email_from" IS NULL;
--> statement-breakpoint
-- HOD decisions are now final: abstracts sent by a department and waiting for the old Scientific Committee check take the HOD's decision
UPDATE "abstracts" SET "status" = 'ACCEPTED', "accepted_as" = CASE "hod_decision" WHEN 'ACCEPT_POSTER' THEN 'POSTER' ELSE 'ORAL' END, "type" = CASE "hod_decision" WHEN 'ACCEPT_POSTER' THEN 'POSTER'::"abstract_type" ELSE 'ORAL'::"abstract_type" END, "decided_at" = now() WHERE "status" = 'UNDER_REVIEW' AND "hod_decision" IN ('ACCEPT_ORAL', 'ACCEPT_POSTER');--> statement-breakpoint
UPDATE "abstracts" SET "status" = 'REJECTED', "decided_at" = now() WHERE "status" = 'UNDER_REVIEW' AND "hod_decision" = 'REJECT';
