-- Registration redesign, release 3: a unique ticket number (and QR) per workshop ticket (D4) and the day-before workshop reminder.
ALTER TABLE "registration_items" ADD COLUMN IF NOT EXISTS "ticket_no" text;--> statement-breakpoint
ALTER TABLE "registration_items" ADD COLUMN IF NOT EXISTS "reminded_at" timestamp with time zone;--> statement-breakpoint
UPDATE "registration_items" i SET "ticket_no" = t."no" FROM (
  SELECT ri."id", r."reg_no" || '-W' || row_number() OVER (PARTITION BY ri."registration_id" ORDER BY s."starts_at", ri."id") AS "no"
  FROM "registration_items" ri JOIN "registrations" r ON r."id" = ri."registration_id" JOIN "sessions" s ON s."id" = ri."session_id"
) t WHERE i."id" = t."id" AND i."ticket_no" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "registration_items_ticket_no_unique" ON "registration_items" ("ticket_no");
