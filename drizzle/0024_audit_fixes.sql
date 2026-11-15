-- 16 Nov 2026 audit: rate limits shared by every app instance (Vercel), kept for a day
CREATE TABLE IF NOT EXISTS "rate_limits" (
  "key" text PRIMARY KEY,
  "window_start" timestamp with time zone DEFAULT now() NOT NULL,
  "hits" integer DEFAULT 1 NOT NULL
);
