-- Workshop Decisions and New Requirements (LNH answers, 13 Nov 2026)
-- D1 multi-day workshops, N1 request fields, N2 workshop mode, N3 Workshop Director + facilitators,
-- D5 workshop venue list (workshops only), N5 department focal person verifies attendance,
-- N6 automatic workshop e-certificates, N7 new workshop feedback form, N8 workshop window.
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'FOCAL_PERSON';--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "days" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "proposed_title" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "organiser" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "objectives" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "target_audience" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "prelim_programme" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "mode" text DEFAULT 'ONSITE' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "online_link" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "facilitator_names" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "sessions" SET "proposed_title" = "title" WHERE "type" = 'WORKSHOP' AND "proposed_title" IS NULL;--> statement-breakpoint
ALTER TABLE "registration_items" ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "registration_items" ADD COLUMN IF NOT EXISTS "verified_by" text;--> statement-breakpoint
ALTER TABLE "registration_items" ADD COLUMN IF NOT EXISTS "cert_no" text;--> statement-breakpoint
ALTER TABLE "registration_items" ADD COLUMN IF NOT EXISTS "cert_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reg_item_cert_uq" ON "registration_items" ("cert_no");--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "registration_id" text REFERENCES "registrations"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "answers" jsonb;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "recommend_choice" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "contact_ok" boolean;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "usage" text DEFAULT 'BOTH' NOT NULL;--> statement-breakpoint
UPDATE "venues" SET "usage" = 'SCIENTIFIC' WHERE "usage" = 'BOTH';--> statement-breakpoint
INSERT INTO "venues" ("id", "name", "building", "capacity", "equipment", "map_x", "map_y", "usage") SELECT gen_random_uuid()::text, v.n, v.b, v.c, v.e, v.x, v.y, 'WORKSHOP' FROM (VALUES
('Medical College - Lecture Hall A', 'Medical College', 120, NULL, 18.0, 50),
('Medical College - Lecture Hall B', 'Medical College', 120, NULL, 20.5, 50),
('Medical College - Lecture Hall C', 'Medical College', 120, NULL, 23.0, 50),
('Medical College - Anatomy Tutorial Room', 'Medical College', 50, NULL, 25.5, 50),
('Medical College - Biochemistry Tutorial Room', 'Medical College', 50, NULL, 18.0, 53),
('Medical College - Pharmacology Tutorial Room', 'Medical College', 50, NULL, 20.5, 53),
('Medical College - Pathology Tutorial Room', 'Medical College', 50, NULL, 23.0, 53),
('Medical College - Physiology Tutorial Room', 'Medical College', 35, NULL, 25.5, 53),
('Medical College - Community Medicine / Forensic Medicine Tutorial Room', 'Medical College', 35, NULL, 18.0, 56),
('Convention Center - Hall D', 'Convention Center', 35, NULL, 48.0, 32),
('Radiology Tutorial Room', 'Radiology', 50, 'Future area (empty space for hands-on): 50', 82.0, 28),
('Oncology Tutorial Room No. 6', 'Oncology', 10, NULL, 86.0, 44),
('Dental OPD Conference Room', 'Dental', 15, NULL, 78.0, 64),
('Orthopaedic Ward - AZ Rehman Conference Room', 'Orthopaedic Ward', 25, NULL, 88.0, 56),
('Plastic Surgery Conference Room', 'Plastic Surgery', 20, NULL, 84.0, 70),
('School of Physiotherapy - Lecture Hall 1', 'School of Physiotherapy', 50, 'Focal person: workshop sessions of 30-40 people can be arranged', 66.0, 80),
('School of Physiotherapy - Lecture Hall 2', 'School of Physiotherapy', 50, 'Focal person: workshop sessions of 30-40 people can be arranged', 68.5, 80),
('School of Physiotherapy - Lecture Hall 3', 'School of Physiotherapy', 50, 'Focal person: workshop sessions of 30-40 people can be arranged', 71.0, 80),
('School of Physiotherapy - Lecture Hall 4', 'School of Physiotherapy', 50, 'Focal person: workshop sessions of 30-40 people can be arranged', 73.5, 80),
('School of Physiotherapy - Lecture Hall 5', 'School of Physiotherapy', 50, 'Focal person: workshop sessions of 30-40 people can be arranged', 66.0, 83),
('School of Physiotherapy - Lecture Hall A', 'School of Physiotherapy', 50, 'Focal person: workshop sessions of 30-40 people can be arranged', 68.5, 83),
('School of Physiotherapy - Lecture Hall B', 'School of Physiotherapy', 50, 'Focal person: workshop sessions of 30-40 people can be arranged', 71.0, 83),
('BSMT - Tutorial Room A', 'BSMT', 50, NULL, 54.0, 70),
('BSMT - Tutorial Room B', 'BSMT', 50, NULL, 56.5, 70),
('BSMT - Lecture Hall A', 'BSMT', 80, NULL, 59.0, 70),
('BSMT - Lecture Hall B', 'BSMT', 80, NULL, 61.5, 70),
('BSMT - Annexure Room', 'BSMT', 60, NULL, 54.0, 73),
('College of Nursing - Hall A', 'College of Nursing', 60, NULL, 32.0, 84),
('College of Nursing - Hall B', 'College of Nursing', 30, 'Focal person: capacity is 40', 34.5, 84),
('College of Nursing - Hall C', 'College of Nursing', 60, NULL, 37.0, 84),
('College of Nursing - Hall D', 'College of Nursing', 30, 'Focal person: capacity is 40', 39.5, 84),
('College of Nursing - Hall E', 'College of Nursing', 60, NULL, 32.0, 87),
('College of Nursing - Hall F', 'College of Nursing', 30, 'Focal person: capacity is 40', 34.5, 87),
('HR Conference Room', 'HR', 15, NULL, 40.0, 60),
('Research & Skills Development Centre - Room 4', 'Research & Skills Development Centre', 30, NULL, 70.0, 55),
('Research & Skills Development Centre - Room 3', 'Research & Skills Development Centre', 20, NULL, 72.5, 55),
('Research & Skills Development Centre - Animal Lab', 'Research & Skills Development Centre', 20, NULL, 75.0, 55),
('Research & Skills Development Centre - Laparoscopy Lab', 'Research & Skills Development Centre', 20, NULL, 77.5, 55),
('Research & Skills Development Centre - Computer Lab', 'Research & Skills Development Centre', 20, NULL, 70.0, 58),
('Convention Center - Hall A', 'Convention Center', 90, NULL, 50.5, 32),
('Convention Center - Hall B', 'Convention Center', 85, NULL, 53.0, 32),
('Convention Center - Hall C', 'Convention Center', 50, NULL, 55.5, 32),
('Convention Center - Auditorium', 'Convention Center', 350, NULL, 48.0, 35)
) AS v(n, b, c, e, x, y) ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
UPDATE "event" SET "workshop_start" = '2026-12-15T00:00:00+05:00', "workshop_end" = '2027-01-16T23:59:59+05:00';
