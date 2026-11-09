-- Release 1 of the registration redesign (3-4 Nov 2026): Symposium Pass and workshop tickets are separate products (D1),
-- one pass per delegate, later orders linked to the first registration, one banquet pass included with every pass (D3).
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "has_pass" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "primary_reg_id" text;--> statement-breakpoint
-- Every registration holds a pass except participant orders that paid no conference fee and only carry workshop items
UPDATE "registrations" r SET "has_pass" = NOT ("reg_type" = 'PARTICIPANT' AND "conference_fee" = 0 AND EXISTS (SELECT 1 FROM "registration_items" i WHERE i."registration_id" = r."id"));--> statement-breakpoint
-- Link later orders of the same account to its first registration
UPDATE "registrations" r SET "primary_reg_id" = f."id" FROM (
  SELECT DISTINCT ON ("account_id") "account_id", "id" FROM "registrations" WHERE "account_id" IS NOT NULL ORDER BY "account_id", "created_at"
) f WHERE r."account_id" = f."account_id" AND r."id" <> f."id" AND r."primary_reg_id" IS NULL;--> statement-breakpoint
-- Scientific and plenary sessions are covered by the pass and are no longer booked as items
UPDATE "sessions" SET "registrable" = false WHERE "type" <> 'WORKSHOP' AND "registrable" = true;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reg_account_idx" ON "registrations" ("account_id");
