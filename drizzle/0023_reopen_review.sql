-- 15 Nov 2026: abstracts submitted after a department had sent its decisions were hidden from its portal.
-- Reopen the review for any department that has such undecided abstracts (decisions already sent are unchanged).
UPDATE "departments" d SET "p1_submitted_at" = NULL WHERE "p1_submitted_at" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "abstracts" a WHERE a."assigned_dept" = d."name" AND a."phase" = 1 AND a."status" = 'SUBMITTED');--> statement-breakpoint
UPDATE "departments" d SET "p2_submitted_at" = NULL, "p2_required" = true WHERE "p2_submitted_at" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "abstracts" a WHERE a."assigned_dept" = d."name" AND a."phase" = 2 AND a."status" = 'SUBMITTED');
