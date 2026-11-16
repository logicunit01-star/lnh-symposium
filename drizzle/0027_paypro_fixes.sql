-- 16 Nov 2026 PayPro fixes: unpaid workshop seats are held for a set time (P1); payments flagged for staff (P2-P4)
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "seat_hold_hours" integer DEFAULT 72 NOT NULL;--> statement-breakpoint
-- registrations made before this release get the full hold from today, not from when they registered
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "seat_hold_since" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "flag" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "flag_note" text;
