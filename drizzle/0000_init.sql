CREATE TYPE "public"."abstract_status" AS ENUM('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'REVISION');--> statement-breakpoint
CREATE TYPE "public"."abstract_type" AS ENUM('ORAL', 'POSTER');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('EMAIL', 'SMS');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'FAILED', 'WAIVED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'SCIENTIFIC_COMMITTEE', 'REGISTRATION_DESK', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('KEYNOTE', 'PLENARY', 'SCIENTIFIC', 'PANEL', 'WORKSHOP', 'CEREMONY', 'BREAK');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "abstracts" (
	"id" text PRIMARY KEY NOT NULL,
	"ref_no" text NOT NULL,
	"type" "abstract_type" NOT NULL,
	"title" text NOT NULL,
	"gender" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"profession" text,
	"organization" text NOT NULL,
	"department" text NOT NULL,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"telephone" text,
	"mobile" text NOT NULL,
	"email" text NOT NULL,
	"qualification" text,
	"qualification_year" integer,
	"specialty" text NOT NULL,
	"authors" text NOT NULL,
	"presenting_author" text NOT NULL,
	"abstract_title" text NOT NULL,
	"body" text NOT NULL,
	"keywords" text,
	"word_count" integer NOT NULL,
	"status" "abstract_status" DEFAULT 'SUBMITTED' NOT NULL,
	"score" integer,
	"reviewer_notes" text,
	"reviewer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "abstracts_ref_no_unique" UNIQUE("ref_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "committee_members" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"designation" text,
	"department" text,
	"role" text NOT NULL,
	"group" text DEFAULT 'Organizing Committee' NOT NULL,
	"photo_url" text,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"handled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "counters" (
	"key" text PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"edition" text DEFAULT '9th' NOT NULL,
	"name" text NOT NULL,
	"theme" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"venue" text NOT NULL,
	"virtual_link" text,
	"hero_video_url" text,
	"registration_open" boolean DEFAULT true NOT NULL,
	"early_bird_until" timestamp with time zone,
	"abstract_open" timestamp with time zone,
	"abstract_deadline" timestamp with time zone,
	"abstract_word_limit" integer DEFAULT 300 NOT NULL,
	"contact_email" text DEFAULT 'symposium@lnh.edu.pk' NOT NULL,
	"contact_phone" text DEFAULT '+92 21 111 456 456' NOT NULL,
	"facebook" text,
	"instagram" text,
	"linkedin" text,
	"youtube" text,
	"x" text,
	"videos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fee_category" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"fee" integer NOT NULL,
	"early_fee" integer NOT NULL,
	"note" text,
	"order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "fee_category_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"overall" integer NOT NULL,
	"content" integer NOT NULL,
	"speaker" integer NOT NULL,
	"organization" integer NOT NULL,
	"relevance" integer NOT NULL,
	"recommend" boolean DEFAULT true NOT NULL,
	"comments" text,
	"reg_no" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_log" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" "channel" NOT NULL,
	"to" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"registration_id" text NOT NULL,
	"provider" text NOT NULL,
	"amount" integer NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"txn_ref" text NOT NULL,
	"provider_ref" text,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_txn_ref_unique" UNIQUE("txn_ref")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registration_items" (
	"id" text PRIMARY KEY NOT NULL,
	"registration_id" text NOT NULL,
	"session_id" text NOT NULL,
	"fee" integer NOT NULL,
	"attended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registrations" (
	"id" text PRIMARY KEY NOT NULL,
	"reg_no" text NOT NULL,
	"access_token" text NOT NULL,
	"title" text NOT NULL,
	"gender" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"pmdc_no" text,
	"specialty" text,
	"designation" text,
	"institution" text NOT NULL,
	"address" text,
	"city" text,
	"category_id" integer NOT NULL,
	"conference_fee" integer NOT NULL,
	"total_fee" integer NOT NULL,
	"early_bird" boolean DEFAULT false NOT NULL,
	"payment_status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"payment_method" text,
	"paid_at" timestamp with time zone,
	"checked_in_at" timestamp with time zone,
	"certificate_no" text,
	"certificate_at" timestamp with time zone,
	"notes" text,
	"reminded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_reg_no_unique" UNIQUE("reg_no"),
	CONSTRAINT "registrations_access_token_unique" UNIQUE("access_token"),
	CONSTRAINT "registrations_certificate_no_unique" UNIQUE("certificate_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session_speakers" (
	"session_id" text NOT NULL,
	"speaker_id" text NOT NULL,
	"role" text DEFAULT 'Speaker' NOT NULL,
	CONSTRAINT "session_speakers_session_id_speaker_id_pk" PRIMARY KEY("session_id","speaker_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"type" "session_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"track" text,
	"day" integer DEFAULT 1 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"hall" text,
	"capacity" integer,
	"fee" integer DEFAULT 0 NOT NULL,
	"early_fee" integer,
	"registrable" boolean DEFAULT false NOT NULL,
	"feedback_open" boolean DEFAULT true NOT NULL,
	"cme_hours" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "speakers" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"name" text NOT NULL,
	"designation" text,
	"institution" text,
	"country" text DEFAULT 'Pakistan',
	"bio" text,
	"topic" text,
	"photo_url" text,
	"linkedin" text,
	"featured" boolean DEFAULT false NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'VIEWER' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "abstracts" ADD CONSTRAINT "abstracts_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback" ADD CONSTRAINT "feedback_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_items" ADD CONSTRAINT "registration_items_registration_id_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."registrations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_items" ADD CONSTRAINT "registration_items_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registrations" ADD CONSTRAINT "registrations_category_id_fee_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."fee_category"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_speakers" ADD CONSTRAINT "session_speakers_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "session_speakers" ADD CONSTRAINT "session_speakers_speaker_id_speakers_id_fk" FOREIGN KEY ("speaker_id") REFERENCES "public"."speakers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "abs_status_idx" ON "abstracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fb_session_idx" ON "feedback" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reg_item_uq" ON "registration_items" USING btree ("registration_id","session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reg_email_idx" ON "registrations" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reg_pay_idx" ON "registrations" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_day_idx" ON "sessions" USING btree ("day","starts_at");