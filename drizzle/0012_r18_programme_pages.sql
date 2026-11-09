-- Dashboard Instructions for vendor (revised 06-11-2026), Public Dashboard point 4: Programme pages
-- "Pre-Symposium Webinar/Panel Discussion" and "Meet the Experts" (guest photo, name, affiliation, qualification + programme format).
CREATE TABLE IF NOT EXISTS "programme_pages" (
  "key" text PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "date_text" text,
  "format" text,
  "description" text,
  "published" boolean DEFAULT false NOT NULL,
  "updated_by" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "programme_guests" (
  "id" text PRIMARY KEY NOT NULL,
  "page_key" text NOT NULL REFERENCES "programme_pages"("key") ON DELETE CASCADE,
  "name" text NOT NULL,
  "affiliation" text,
  "qualification" text,
  "topic" text,
  "photo_url" text,
  "photo_mime" text,
  "photo_data" text,
  "order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pg_page_idx" ON "programme_guests" ("page_key");--> statement-breakpoint
INSERT INTO "programme_pages" ("key", "title") VALUES ('WEBINAR', 'Pre-Symposium Webinar / Panel Discussion'), ('EXPERTS', 'Meet the Experts') ON CONFLICT ("key") DO NOTHING;
