-- 16 Nov 2026 (issues email item 5): one overall symposium feedback per symposium registration
CREATE TABLE IF NOT EXISTS "symposium_feedback" (
  "id" text PRIMARY KEY NOT NULL,
  "registration_id" text NOT NULL REFERENCES "registrations"("id") ON DELETE CASCADE,
  "reg_no" text NOT NULL,
  "overall" integer NOT NULL,
  "content" integer NOT NULL,
  "speaker" integer NOT NULL,
  "relevance" integer NOT NULL,
  "organization" integer NOT NULL,
  "recommend" boolean NOT NULL,
  "comments" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "symfb_reg_uq" ON "symposium_feedback" ("registration_id");
