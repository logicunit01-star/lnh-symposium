// r9 prep (server stopped): clear Admin → Payments settings, print 3 pending registration tokens
const { db } = await import(process.cwd() + "/src/lib/db/index.ts");
const { sql } = await import("drizzle-orm");
await db.execute(sql`delete from payment_settings`);
const r: any = await db.execute(sql`select access_token t from registrations where payment_status = 'PENDING' and total_fee > 0 order by created_at desc limit 3`);
console.log((r.rows ?? r).map((x: any) => x.t).join(" ")); process.exit(0);
