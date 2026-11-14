// R21 test prep: an approved Anesthesia workshop that started yesterday, with two paid participants. Run with the server stopped.
const { db } = await import(process.cwd() + "/src/lib/db/index.ts");
const { sql } = await import("drizzle-orm");
const q = async (x: any) => { const r: any = await db.execute(x); return r.rows ?? r; };
// clean up earlier test runs
await q(sql`delete from session_reviews where session_id in (select id from sessions where title like 'R21 %')`);
await q(sql`delete from sessions where title like 'R21 %'`);
await q(sql`delete from users where role = 'FOCAL_PERSON' and email like '%focal%@lnh.edu.pk'`);
const [w] = await q(sql`select s.id, s.slug, s.title from sessions s where s.type = 'WORKSHOP' and s.status = 'APPROVED' and s.department ilike 'anesth%'
  and (select count(*) from registration_items ri join registrations r on r.id = ri.registration_id where ri.session_id = s.id and r.payment_status in ('PAID','WAIVED')) >= 2 order by s.starts_at limit 1`);
if (!w) { console.log(JSON.stringify({ error: "no workshop" })); process.exit(0); }
await q(sql`update sessions set starts_at = now() - interval '26 hours', ends_at = now() - interval '22 hours', feedback_open = true where id = ${w.id}`);
await q(sql`update registration_items set verified_at = null, verified_by = null, cert_no = null, cert_at = null where session_id = ${w.id}`);
await q(sql`delete from feedback where session_id = ${w.id}`);
const ppl = await q(sql`select r.reg_no, r.email, r.access_token t, ri.id item from registration_items ri join registrations r on r.id = ri.registration_id where ri.session_id = ${w.id} and r.payment_status in ('PAID','WAIVED') order by r.reg_no limit 2`);
const venues = await q(sql`select usage, count(*)::int n from venues group by usage`);
const ev = await q(sql`select workshop_start, workshop_end from event`);
console.log(JSON.stringify({ w, ppl, venues, ev }));
process.exit(0);
