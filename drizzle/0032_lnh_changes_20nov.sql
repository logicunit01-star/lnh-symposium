-- 20 Nov 2026 ("sym changes web 2027 (20-11-2026)"): "coming soon" switches for the workshops and e-certificate pages,
-- the new homepage ticker, and the "At a glance" heading back to its new default
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "workshops_live" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "certificates_live" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "event" SET "ticker_items" = '["Avail Early-Bird Registration Discount","Register Now","Submit Your Abstract Online","Pre-Symposium Workshops Coming Soon"]'::jsonb;--> statement-breakpoint
UPDATE "event" SET "home_text" = "home_text" - 'glanceTitle' - 'glanceHighlight';
