-- Homepage changes recommendations (11.11.2026): editable ticker, previous-symposium gallery link,
-- and switches to show "View Agenda" / speakers only once those pages go live.
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "ticker_items" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "gallery_url" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "gallery_thumb_url" text;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "agenda_live" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "speakers_live" boolean DEFAULT false NOT NULL;
