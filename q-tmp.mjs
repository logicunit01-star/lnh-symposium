import { PGlite } from "@electric-sql/pglite";
const db = new PGlite(process.env.HOME + "/dbcopy");
const m = await db.query(`select id, hash, created_at from drizzle.__drizzle_migrations order by created_at`).catch(e=>({rows:[String(e.message)]}));
console.log(m.rows);
const c = await db.query(`select column_name from information_schema.columns where table_name='event' and column_name in ('qc_guidelines','banquet_fee','email_from')`);
console.log(c.rows);
const r = await db.query(`select column_name from information_schema.columns where table_name='registrations' and column_name in ('has_pass','primary_reg_id','cnic')`);
console.log(r.rows);
