-- 15 Nov 2026: departments as records, enforced everywhere; department roles per person; staff change log.
-- 1) department details
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "code" text;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "kind" text DEFAULT 'CLINICAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "email" text;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "needs_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- the Scientific Committee owns plenaries and debates (not shown in public department lists)
INSERT INTO "departments" ("name", "kind", "order") VALUES ('Scientific Committee', 'COMMITTEE', 1000) ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "departments" SET "kind" = 'COMMITTEE' WHERE "name" = 'Scientific Committee';--> statement-breakpoint
-- volunteers type their own department/programme (free text): kept in its own column, outside the department list
ALTER TABLE "registrations" ADD COLUMN IF NOT EXISTS "volunteer_department" text;--> statement-breakpoint
UPDATE "registrations" SET "volunteer_department" = "department", "department" = NULL WHERE "reg_type" = 'VOLUNTEER';--> statement-breakpoint
-- 2) tidy the department text already stored: spaces, then capitals (match the list ignoring case)
UPDATE "users" SET "department" = NULLIF(regexp_replace(trim("department"), '\s+', ' ', 'g'), '') WHERE "department" IS NOT NULL;--> statement-breakpoint
UPDATE "sessions" SET "department" = NULLIF(regexp_replace(trim("department"), '\s+', ' ', 'g'), '') WHERE "department" IS NOT NULL;--> statement-breakpoint
UPDATE "registrations" SET "department" = NULLIF(regexp_replace(trim("department"), '\s+', ' ', 'g'), '') WHERE "department" IS NOT NULL;--> statement-breakpoint
UPDATE "abstracts" SET "specialty" = regexp_replace(trim("specialty"), '\s+', ' ', 'g');--> statement-breakpoint
UPDATE "abstracts" SET "assigned_dept" = NULLIF(regexp_replace(trim("assigned_dept"), '\s+', ' ', 'g'), '') WHERE "assigned_dept" IS NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_departments" (
  "session_id" text NOT NULL REFERENCES "sessions"("id") ON DELETE CASCADE,
  "department" text NOT NULL,
  PRIMARY KEY ("session_id", "department")
);--> statement-breakpoint
INSERT INTO "session_departments" ("session_id", "department")
  SELECT DISTINCT s."id", regexp_replace(trim(x), '\s+', ' ', 'g') FROM "sessions" s, unnest(string_to_array(s."contributors", ',')) x
  WHERE s."contributors" IS NOT NULL AND trim(x) <> '' ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "users" t SET "department" = d."name" FROM "departments" d WHERE lower(t."department") = lower(d."name") AND t."department" <> d."name";--> statement-breakpoint
UPDATE "sessions" t SET "department" = d."name" FROM "departments" d WHERE lower(t."department") = lower(d."name") AND t."department" <> d."name";--> statement-breakpoint
UPDATE "registrations" t SET "department" = d."name" FROM "departments" d WHERE lower(t."department") = lower(d."name") AND t."department" <> d."name";--> statement-breakpoint
UPDATE "abstracts" t SET "specialty" = d."name" FROM "departments" d WHERE lower(t."specialty") = lower(d."name") AND t."specialty" <> d."name";--> statement-breakpoint
UPDATE "abstracts" t SET "assigned_dept" = d."name" FROM "departments" d WHERE lower(t."assigned_dept") = lower(d."name") AND t."assigned_dept" <> d."name";--> statement-breakpoint
DELETE FROM "session_departments" t USING "departments" d, "session_departments" t2
  WHERE lower(t."department") = lower(d."name") AND t."department" <> d."name" AND t2."session_id" = t."session_id" AND t2."department" = d."name";--> statement-breakpoint
UPDATE "session_departments" t SET "department" = d."name" FROM "departments" d WHERE lower(t."department") = lower(d."name") AND t."department" <> d."name";--> statement-breakpoint
-- common alternative spellings -> the listed name
CREATE TABLE IF NOT EXISTS "_dept_alias" ("alias" text PRIMARY KEY, "name" text NOT NULL);--> statement-breakpoint
INSERT INTO "_dept_alias" VALUES ('anaesthesia', 'Anesthesia'), ('anaesthesiology', 'Anesthesia'), ('anesthesiology', 'Anesthesia'), ('paediatrics', 'Pediatric medicine'), ('pediatrics', 'Pediatric medicine'),
  ('emergency medicine', 'Accident & Emergency'), ('emergency', 'Accident & Emergency'), ('administration', 'Admin/ Management'), ('management', 'Admin/ Management'),
  ('obstetrics & gynaecology', 'Obstetrics/ Gynecology'), ('obstetrics and gynecology', 'Obstetrics/ Gynecology'), ('gynaecology', 'Obstetrics/ Gynecology'), ('orthopaedic surgery', 'Orthopedic Surgery'),
  ('haematology', 'Hematology'), ('pulmonology', 'Pulmonology/Chest medicine'), ('psychiatry', 'Psychiatry/Mental Health'), ('paediatric surgery', 'Pediatric surgery') ON CONFLICT DO NOTHING;--> statement-breakpoint
DELETE FROM "_dept_alias" a WHERE NOT EXISTS (SELECT 1 FROM "departments" d WHERE d."name" = a."name");--> statement-breakpoint
UPDATE "users" t SET "department" = a."name" FROM "_dept_alias" a WHERE lower(t."department") = a."alias";--> statement-breakpoint
UPDATE "sessions" t SET "department" = a."name" FROM "_dept_alias" a WHERE lower(t."department") = a."alias";--> statement-breakpoint
UPDATE "registrations" t SET "department" = a."name" FROM "_dept_alias" a WHERE lower(t."department") = a."alias";--> statement-breakpoint
UPDATE "abstracts" t SET "specialty" = a."name" FROM "_dept_alias" a WHERE lower(t."specialty") = a."alias";--> statement-breakpoint
UPDATE "abstracts" t SET "assigned_dept" = a."name" FROM "_dept_alias" a WHERE lower(t."assigned_dept") = a."alias";--> statement-breakpoint
DELETE FROM "session_departments" t USING "_dept_alias" a, "session_departments" t2
  WHERE lower(t."department") = a."alias" AND t2."session_id" = t."session_id" AND t2."department" = a."name";--> statement-breakpoint
UPDATE "session_departments" t SET "department" = a."name" FROM "_dept_alias" a WHERE lower(t."department") = a."alias";--> statement-breakpoint
DROP TABLE "_dept_alias";--> statement-breakpoint
-- 3) any spelling still not on the list becomes an inactive department marked "needs review" (rename or merge it in Admin -> Departments)
INSERT INTO "departments" ("name", "active", "needs_review", "order")
  SELECT DISTINCT v, false, true, 900 FROM (
    SELECT "department" v FROM "users" UNION SELECT "department" FROM "sessions" UNION SELECT "department" FROM "registrations"
    UNION SELECT "specialty" FROM "abstracts" UNION SELECT "assigned_dept" FROM "abstracts" UNION SELECT "department" FROM "session_departments"
  ) x WHERE v IS NOT NULL AND v <> '' ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
-- 4) every department field must hold a listed name; renaming a department updates them all
ALTER TABLE "session_departments" ADD CONSTRAINT "session_departments_department_fk" FOREIGN KEY ("department") REFERENCES "departments"("name") ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_department_fk" FOREIGN KEY ("department") REFERENCES "departments"("name") ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_department_fk" FOREIGN KEY ("department") REFERENCES "departments"("name") ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "abstracts" ADD CONSTRAINT "abstracts_specialty_fk" FOREIGN KEY ("specialty") REFERENCES "departments"("name") ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "abstracts" ADD CONSTRAINT "abstracts_assigned_dept_fk" FOREIGN KEY ("assigned_dept") REFERENCES "departments"("name") ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN IF EXISTS "contributors";--> statement-breakpoint
-- 5) department roles: Heads (HOD logins) and focal persons move to user_departments; their global role becomes "Department staff only"
CREATE TABLE IF NOT EXISTS "user_departments" (
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "department" text NOT NULL REFERENCES "departments"("name") ON UPDATE CASCADE,
  "role" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("user_id", "department")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ud_dept_idx" ON "user_departments" ("department");--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" TYPE text USING "role"::text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VIEWER';--> statement-breakpoint
INSERT INTO "user_departments" ("user_id", "department", "role")
  SELECT "id", "department", CASE "role" WHEN 'HOD' THEN 'HEAD' ELSE 'FOCAL_PERSON' END FROM "users"
  WHERE "role" IN ('HOD', 'FOCAL_PERSON') AND "department" IS NOT NULL ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "users" SET "role" = 'DEPARTMENT' WHERE "role" IN ('HOD', 'FOCAL_PERSON');--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "department";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signed_out_at" timestamp with time zone;--> statement-breakpoint
-- 6) change log for staff logins
CREATE TABLE IF NOT EXISTS "staff_audit" (
  "id" text PRIMARY KEY,
  "actor" text NOT NULL,
  "target_id" text,
  "target" text NOT NULL,
  "action" text NOT NULL,
  "detail" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sa_target_idx" ON "staff_audit" ("target_id");
