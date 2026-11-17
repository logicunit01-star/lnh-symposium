(async () => { if (require("node:fs").existsSync(".env")) process.loadEnvFile(".env");
  const { db } = await import(process.cwd() + "/src/lib/db/index.ts"); const { sql } = await import("drizzle-orm");
  const q = async (x: any) => { const r: any = await db.execute(x); return r.rows ?? r; };
  const [r] = await q(sql`select r.id, r.access_token from registrations r where r.payment_status in ('PAID','WAIVED') and (select count(*) from registration_items i where i.registration_id = r.id) >= 1 order by r.created_at desc limit 1`);
  await db.execute(sql`update sessions set starts_at = now() - interval '2 hours', feedback_open = true where id in (select session_id from registration_items where registration_id = ${r.id})`);
  await db.execute(sql`update registration_items set attended_at = now() where id = (select id from registration_items where registration_id = ${r.id} limit 1)`);
  console.log(r.access_token); process.exit(0); })();
