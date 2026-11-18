-- 18 Nov 2026 ("sym changes web 2027"): contact number, X link and the hero line from LNH
UPDATE "event" SET "contact_phone" = '021-34412679';--> statement-breakpoint
UPDATE "event" SET "x" = 'https://x.com/lnhandmc' WHERE "x" IS NULL OR "x" = '';--> statement-breakpoint
UPDATE "event" SET "tagline" = 'Exploring how emerging technologies are making healthcare faster, safer and more precise.'
  WHERE "tagline" IS NULL OR "tagline" = '' OR "tagline" = 'Where artificial intelligence, robotics and digital care meet the realities of cost and quality.';
