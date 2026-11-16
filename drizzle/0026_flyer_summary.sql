-- 16 Nov 2026: short flyer summary for workshops (max 140 characters, two lines on the flyer)
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "flyer_summary" text;
