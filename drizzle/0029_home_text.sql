-- 16 Nov 2026: home page headings and day themes editable in Event settings (empty = the built-in wording)
ALTER TABLE "event" ADD COLUMN IF NOT EXISTS "home_text" jsonb DEFAULT '{}'::jsonb NOT NULL;
