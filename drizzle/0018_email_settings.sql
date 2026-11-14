-- Email settings (14 Nov 2026): sending mailboxes (encrypted passwords), delivery mode, and per-notification sender, CC and reply-to.
CREATE TABLE IF NOT EXISTS "mail_accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "host" text NOT NULL,
  "port" integer DEFAULT 465 NOT NULL,
  "security" text DEFAULT 'SSL' NOT NULL,
  "username" text NOT NULL,
  "secret" text,
  "from_name" text NOT NULL,
  "from_address" text NOT NULL,
  "reply_to" text,
  "is_default" boolean DEFAULT false NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "updated_by" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mail_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "mode" text DEFAULT 'SEND' NOT NULL,
  "test_address" text,
  "updated_by" text,
  "updated_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "account_id" text;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "from_name" text;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "cc" text;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "reply_to" text;
