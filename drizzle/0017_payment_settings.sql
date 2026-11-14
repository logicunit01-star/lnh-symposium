-- PayPro switch (Off / Demo / Live) and encrypted credentials, managed by the Super Admin only (14 Nov 2026).
CREATE TABLE IF NOT EXISTS "payment_settings" (
  "id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
  "mode" text,
  "secrets" text,
  "updated_by" text,
  "updated_at" timestamp with time zone
);
