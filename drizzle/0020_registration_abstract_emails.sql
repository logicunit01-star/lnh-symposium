-- Email templates 14.11.2026: dates and Scientific Committee email used in the abstract decision emails
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "abstract_confirm_by" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "schedule_update_by" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "presenter_reg_by" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "sc_email" text;
