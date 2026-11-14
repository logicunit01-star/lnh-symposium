const { db } = await import(process.cwd() + "/src/lib/db/index.ts");
const { sql } = await import("drizzle-orm");
const q = async (x: any) => { const r: any = await db.execute(x); return r.rows ?? r; };
if (process.argv[2] === "pending") console.log(JSON.stringify(await q(sql`select access_token t, total_fee fee, reg_no from registrations where payment_status = 'PENDING' and total_fee > 0 order by created_at desc limit 3`)));
if (process.argv[2] === "pays") console.log(JSON.stringify(await q(sql`select r.reg_no, r.payment_status rs, p.txn_ref, p.status, p.provider_ref from payments p join registrations r on r.id = p.registration_id where p.provider = 'paypro' order by p.created_at`)));
process.exit(0);
