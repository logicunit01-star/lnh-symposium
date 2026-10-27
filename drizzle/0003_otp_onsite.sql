CREATE TABLE IF NOT EXISTS "otp_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"target" text NOT NULL,
	"code_hash" text NOT NULL,
	"payload" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"sends" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "employee_id" text;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "source" text DEFAULT 'ONLINE' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "otp_target_idx" ON "otp_codes" USING btree ("purpose","target");