ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'MARKETING';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'CATERING';--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "flyer_status" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "flyer_note" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "flyer_reviewed_by" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "flyer_reviewed_at" timestamp with time zone;--> statement-breakpoint
UPDATE "sessions" SET "flyer_status" = 'PENDING' WHERE "type" = 'WORKSHOP' AND "status" = 'APPROVED' AND "flyer_status" IS NULL;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN IF NOT EXISTS "venue_id" text REFERENCES "venues"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN IF NOT EXISTS "placement" text;--> statement-breakpoint
-- SC requirements V1.0: 50 specialities; physiotherapy, speech and occupational therapy share one session
UPDATE "departments" SET "name" = 'Physiotherapy / Speech therapy / Occupational therapy' WHERE "name" = 'Physiotherapy' AND NOT EXISTS (SELECT 1 FROM "departments" WHERE "name" = 'Physiotherapy / Speech therapy / Occupational therapy');--> statement-breakpoint
UPDATE "users" SET "department" = 'Physiotherapy / Speech therapy / Occupational therapy' WHERE "department" IN ('Physiotherapy', 'Speech therapy', 'Occupational therapy');--> statement-breakpoint
UPDATE "abstracts" SET "specialty" = 'Physiotherapy / Speech therapy / Occupational therapy' WHERE "specialty" IN ('Physiotherapy', 'Speech therapy', 'Occupational therapy');--> statement-breakpoint
UPDATE "abstracts" SET "assigned_dept" = 'Physiotherapy / Speech therapy / Occupational therapy' WHERE "assigned_dept" IN ('Physiotherapy', 'Speech therapy', 'Occupational therapy');--> statement-breakpoint
UPDATE "sessions" SET "department" = 'Physiotherapy / Speech therapy / Occupational therapy' WHERE "department" IN ('Physiotherapy', 'Speech therapy', 'Occupational therapy');--> statement-breakpoint
DELETE FROM "departments" WHERE "name" IN ('Physiotherapy', 'Speech therapy', 'Occupational therapy');--> statement-breakpoint
-- Plenary (Day 1) and debate (Day 2) sessions, 11:00-13:00
UPDATE "event" SET "session_slots" = (
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'key'), '[]'::jsonb) FROM (
    SELECT jsonb_array_elements("event"."session_slots") AS x
    UNION ALL SELECT '{"key":"2027-01-29|11:00","day":"2027-01-29","start":"11:00","end":"13:00","optional":false,"special":"PLENARY"}'::jsonb WHERE NOT "event"."session_slots" @> '[{"key":"2027-01-29|11:00"}]'::jsonb
    UNION ALL SELECT '{"key":"2027-01-30|11:00","day":"2027-01-30","start":"11:00","end":"13:00","optional":false,"special":"DEBATE"}'::jsonb WHERE NOT "event"."session_slots" @> '[{"key":"2027-01-30|11:00"}]'::jsonb
  ) t
) WHERE "event_days" @> '["2027-01-29"]'::jsonb;--> statement-breakpoint
UPDATE "event" SET "agenda_templates" = '{"PLENARY":"5 min  Welcome by Moderator\n30 min Keynote address (per keynote speaker)\n40 min Panel discussion\n15 min Audience Q&A and closing","DEBATE":"5 min  Moderator sets the motion\n8 min  Opening statement (per panelist)\n30 min Rebuttals and moderated debate\n15 min Audience Q&A and vote\n5 min  Keynote summary and closing"}'::jsonb || "agenda_templates";--> statement-breakpoint
-- 9th LNH Symposium poster: official theme wording and venue name (only replaces the old defaults)
UPDATE "event" SET "theme" = 'Shaping the New Era of Healthcare' WHERE "theme" = 'Healthcare Conundrum: Cost, Quality, and Technology';--> statement-breakpoint
UPDATE "event" SET "main_theme" = 'Shaping the New Era of Healthcare: Convergence of AI, Robotics & Digitization' WHERE "main_theme" IN ('Shaping the New Era of Health Care: Convergence of AI, Robotics and Digitization', 'Shaping the new era of healthcare: AI-Robotics and Digitization');--> statement-breakpoint
UPDATE "event" SET "venue" = 'Liaquat National Hospital, Stadium Road, Karachi' WHERE "venue" = 'Liaquat National Hospital & Medical College, Stadium Road, Karachi';
