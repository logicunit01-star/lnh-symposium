-- LNH social media links (13 Nov 2026), shown as icons in the site footer.
-- Replaces empty values and the generic placeholders from the first seed (e.g. https://www.facebook.com/); a real link set in Event Settings is kept.
UPDATE "event" SET
  "instagram" = CASE WHEN COALESCE("instagram", '') ~* '^(https?://(www\.)?instagram\.com/?)?$' THEN 'https://www.instagram.com/lnhandmc' ELSE "instagram" END,
  "linkedin" = CASE WHEN COALESCE("linkedin", '') ~* '^(https?://(www\.)?linkedin\.com/?)?$' THEN 'https://www.linkedin.com/company/lnhandmc/' ELSE "linkedin" END,
  "facebook" = CASE WHEN COALESCE("facebook", '') ~* '^(https?://(www\.)?facebook\.com/?)?$' THEN 'https://www.facebook.com/share/1CJDxrqEDS/' ELSE "facebook" END,
  "youtube" = CASE WHEN COALESCE("youtube", '') ~* '^(https?://(www\.)?youtube\.com/?)?$' THEN 'https://www.youtube.com/@lnhandmc' ELSE "youtube" END;
