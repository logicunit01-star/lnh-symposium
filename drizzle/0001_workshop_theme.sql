CREATE TABLE IF NOT EXISTS "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"title" text NOT NULL,
	"gender" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text NOT NULL,
	"pmdc_no" text,
	"specialty" text,
	"designation" text,
	"institution" text NOT NULL,
	"address" text,
	"city" text,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "main_theme" text DEFAULT 'Shaping the new era of healthcare: AI-Robotics and Digitization' NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "event_days" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "reg_prefix" text DEFAULT 'SYM' NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "processing_fee_pct" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "account_id" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "format" text;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "status" text DEFAULT 'APPROVED' NOT NULL;--> statement-breakpoint
ALTER TABLE "speakers" ADD COLUMN "degrees" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registrations" ADD CONSTRAINT "registrations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
