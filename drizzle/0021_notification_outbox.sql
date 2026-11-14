-- 14.11.2026 Part C: one outbox for every email, WhatsApp and SMS (sent by the "lnh-notifier" process on the LNH server), and the eOcean settings
ALTER TABLE "notification_log" ALTER COLUMN "channel" TYPE text USING "channel"::text;--> statement-breakpoint
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "payload" jsonb;--> statement-breakpoint
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_log" ADD COLUMN IF NOT EXISTS "provider_ref" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nl_queue_idx" ON "notification_log" ("status", "next_attempt_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notify_settings" (
  "id" integer PRIMARY KEY DEFAULT 1,
  "wa_enabled" boolean DEFAULT false NOT NULL,
  "sms_enabled" boolean DEFAULT false NOT NULL,
  "api_url" text DEFAULT 'https://api.xnotify.ai/v2/send' NOT NULL,
  "api_key" text,
  "auth_id" text,
  "auth_username" text,
  "wa_channel" text DEFAULT 'Whatsapp' NOT NULL,
  "sms_channel" text DEFAULT 'SMS' NOT NULL,
  "templates" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "email_per_min" integer DEFAULT 60 NOT NULL,
  "msg_per_min" integer DEFAULT 30 NOT NULL,
  "max_attempts" integer DEFAULT 6 NOT NULL,
  "worker_seen_at" timestamp with time zone,
  "updated_by" text,
  "updated_at" timestamp with time zone
);
