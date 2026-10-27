ALTER TYPE "public"."abstract_status" ADD VALUE IF NOT EXISTS 'BACK';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'SC_CHAIR';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'SECRETARIAT';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "abstract_events" (
	"id" text PRIMARY KEY NOT NULL,
	"abstract_id" text NOT NULL,
	"actor" text,
	"action" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"p1_submitted_at" timestamp with time zone,
	"p2_required" boolean DEFAULT false NOT NULL,
	"p2_submitted_at" timestamp with time zone,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_people" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"designation" text,
	"affiliation" text,
	"phone" text,
	"email" text,
	"topic" text,
	"time_slot" text,
	"order" integer DEFAULT 0 NOT NULL,
	"abstract_id" text,
	"invite_token" text,
	"invite_status" text DEFAULT 'NOT_SENT' NOT NULL,
	"invited_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"reminders" integer DEFAULT 0 NOT NULL,
	"last_reminder_at" timestamp with time zone,
	"response_note" text,
	CONSTRAINT "session_people_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
ALTER TABLE "abstracts" ALTER COLUMN "gender" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "abstracts" ALTER COLUMN "first_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "abstracts" ALTER COLUMN "last_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "account_id" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "presentation_pref" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "full_name" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "designation" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "sections" jsonb;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "co_authors" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "title_key" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "assigned_dept" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "phase" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "hod_decision" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "hod_scores" jsonb;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "hod_total" integer;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "hod_notes" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "hod_by" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "hod_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "accepted_as" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "sc_notes" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "author_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "session_order" integer;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "invite_token" text;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "invite_status" text DEFAULT 'NOT_SENT' NOT NULL;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "invited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "responded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "abstracts" ADD COLUMN "reminders" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "session_slots" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "abstract_p1_open" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "abstract_p1_close" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "abstract_p2_open" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "abstract_p2_close" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "sci_lock_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "programme_released_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "agenda_templates" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "proposal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "session_format" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "format_other" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "preferred_slots" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "expected_audience" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "slot_key" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "edit_grant_until" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "abstract_events" ADD CONSTRAINT "abstract_events_abstract_id_abstracts_id_fk" FOREIGN KEY ("abstract_id") REFERENCES "public"."abstracts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_people" ADD CONSTRAINT "session_people_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_people" ADD CONSTRAINT "session_people_abstract_id_abstracts_id_fk" FOREIGN KEY ("abstract_id") REFERENCES "public"."abstracts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "abs_ev_idx" ON "abstract_events" USING btree ("abstract_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sp_session_idx" ON "session_people" USING btree ("session_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "abstracts" ADD CONSTRAINT "abstracts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "abstracts" ADD CONSTRAINT "abstracts_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "abs_title_key_idx" ON "abstracts" USING btree ("title_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "abs_dept_idx" ON "abstracts" USING btree ("assigned_dept");--> statement-breakpoint
ALTER TABLE "abstracts" ADD CONSTRAINT "abstracts_invite_token_unique" UNIQUE("invite_token");