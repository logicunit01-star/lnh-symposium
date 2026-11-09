-- Dashboard Instructions for vendor (revised 06-11-2026): LNH's 7-point quality check guideline replaces our earlier
-- default text. Clear the stored copy only when it is still that earlier default, so the new default shows; text an
-- admin has edited is kept. Existing HOD scores on the old 1-5 sheet stay and are shown out of 25.
UPDATE "event" SET "qc_guidelines" = NULL WHERE "qc_guidelines" LIKE 'Title: clear, specific and no longer than 35 words%';
