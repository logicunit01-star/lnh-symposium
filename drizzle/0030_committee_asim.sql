-- 16 Nov 2026: Website & Social Media Committee member added
INSERT INTO "committee_members" ("id", "name", "role", "group", "order")
SELECT gen_random_uuid()::text, 'Mr. Muhammad Asim Siddiqui', 'Member', 'Website & Social Media Committee', 19011
WHERE NOT EXISTS (SELECT 1 FROM "committee_members" WHERE "name" ILIKE '%Muhammad Asim Siddiqui%');
