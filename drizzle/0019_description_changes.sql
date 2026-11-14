-- "description changes recommendation for symposium website 14.11.2026"
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "whatsapp" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "guest_code" text;--> statement-breakpoint
UPDATE "event" SET "guest_code" = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) WHERE "guest_code" IS NULL;--> statement-breakpoint
-- early bird until 5 December 2026 (was 10 December) and the new symposium contact email; changed only if still at the old values
UPDATE "event" SET "early_bird_until" = '2026-12-05T23:59:59+05:00' WHERE ("early_bird_until" AT TIME ZONE 'Asia/Karachi')::date = '2026-12-10';--> statement-breakpoint
UPDATE "event" SET "contact_email" = 'symposium2027@lnh.edu.pk' WHERE "contact_email" = 'symposium@lnh.edu.pk';
