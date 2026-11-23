-- 23 Nov 2026 (LNH): every workshop has a unique ID WS-0001, WS-0002, ... for records, the portal and the website
-- (not printed on certificates). Given automatically when a workshop row is created, in order of creation.
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "workshop_no" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_workshop_no_uq" ON "sessions" ("workshop_no");--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "workshop_no_seq" START 1;--> statement-breakpoint
WITH n AS (SELECT "id", row_number() OVER (ORDER BY "created_at", "id") AS k FROM "sessions" WHERE "type" = 'WORKSHOP' AND "workshop_no" IS NULL)
UPDATE "sessions" s SET "workshop_no" = 'WS-' || lpad(n.k::text, 4, '0') FROM n WHERE s."id" = n."id";--> statement-breakpoint
SELECT setval('workshop_no_seq', GREATEST(1, COALESCE((SELECT max(substring("workshop_no" from 4)::int) FROM "sessions" WHERE "workshop_no" ~ '^WS-[0-9]+$'), 0)), COALESCE((SELECT max(substring("workshop_no" from 4)::int) FROM "sessions" WHERE "workshop_no" ~ '^WS-[0-9]+$'), 0) > 0);--> statement-breakpoint
CREATE OR REPLACE FUNCTION "assign_workshop_no"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."type" = 'WORKSHOP' AND NEW."workshop_no" IS NULL THEN
    NEW."workshop_no" := 'WS-' || lpad(nextval('workshop_no_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;--> statement-breakpoint
DROP TRIGGER IF EXISTS "sessions_workshop_no" ON "sessions";--> statement-breakpoint
CREATE TRIGGER "sessions_workshop_no" BEFORE INSERT OR UPDATE OF "type" ON "sessions" FOR EACH ROW EXECUTE FUNCTION "assign_workshop_no"();
