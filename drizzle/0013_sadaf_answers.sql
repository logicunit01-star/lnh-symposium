-- Sadaf's answers (10 Nov 2026) to the clarification email.
-- A1: four departments from the Dashboard Instructions (revised 06-11-2026), also in the abstract speciality list.
INSERT INTO "departments" ("name", "order") VALUES ('BME', 50), ('Supply Chain & Finance', 51), ('Foods & Nutrition', 52), ('Human Resources', 53) ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
-- A3: no webinar / panel discussion; the page becomes "Pre-symposium activities" and an "Inaugural session" page is added.
UPDATE "programme_pages" SET "title" = 'Pre-symposium activities' WHERE "key" = 'WEBINAR' AND "title" = 'Pre-Symposium Webinar / Panel Discussion';--> statement-breakpoint
INSERT INTO "programme_pages" ("key", "title") VALUES ('INAUGURAL', 'Inaugural session') ON CONFLICT ("key") DO NOTHING;--> statement-breakpoint
-- A6: automatic reminders (workshop, symposium day-before) can be switched off in Automated Emails.
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "enabled" boolean DEFAULT true NOT NULL;
