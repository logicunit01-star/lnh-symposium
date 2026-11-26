-- 26 Nov 2026 (LNH): the Scientific Committee can send a session back to the department (HOD) for changes after it is
-- approved and on the website. The HOD's changes are kept here as a draft; the website keeps the approved version until
-- the Scientific Committee approves them. edit_grant_until (0004) holds the HOD's edit deadline.
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "revision_status" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "revision_note" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "revision_data" jsonb;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "revision_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "revision_by" text;
