ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'WP_CHAIR';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'WP_MEMBER';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'HOD';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text,
	"user_name" text,
	"from_status" text,
	"to_status" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "venues" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"building" text NOT NULL,
	"floor" text,
	"capacity" integer NOT NULL,
	"online_facility" text,
	"equipment" text,
	"map_x" real DEFAULT 50 NOT NULL,
	"map_y" real DEFAULT 50 NOT NULL,
	"directions" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "venues_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waitlist" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"account_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "workshop_start" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "workshop_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "theme_weeks" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "seat_target" integer DEFAULT 3000 NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "usd_rate" real DEFAULT 280 NOT NULL;--> statement-breakpoint
ALTER TABLE "fee_category" ADD COLUMN "tier" text DEFAULT 'GENERAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "theme_week" integer;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "contributors" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "venue_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "lead_faculty" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "faculty_degrees" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "faculty_contact" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "faculty_profile" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "facilitators" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "volunteers" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "technicians" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "equipment" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "proposed_by_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "reviewed_by_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "co_chair_decision" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_reviews" ADD CONSTRAINT "session_reviews_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_reviews" ADD CONSTRAINT "session_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rev_session_idx" ON "session_reviews" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_uq" ON "waitlist" USING btree ("session_id","email");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_proposed_by_id_users_id_fk" FOREIGN KEY ("proposed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
UPDATE "fee_category" SET "tier" = 'STUDENT' WHERE "code" = 'STUDENT';--> statement-breakpoint
UPDATE "fee_category" SET "tier" = 'EMPLOYEE' WHERE "code" = 'LNH';--> statement-breakpoint
UPDATE "sessions" SET "locked" = true WHERE "type" = 'WORKSHOP' AND "status" IN ('APPROVED', 'REJECTED');
