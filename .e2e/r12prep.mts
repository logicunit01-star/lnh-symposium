// Part B prep (server stopped). argv[2] = "prep" | "check"
const { db } = await import(process.cwd() + "/src/lib/db/index.ts");
const { sql } = await import("drizzle-orm");
const q = async (x: any) => { const r: any = await db.execute(x); return r.rows ?? r; };
if (process.argv[2] === "prep") {
  await db.execute(sql`update mail_settings set mode = 'SEND'`);
  console.error("mailboxes", JSON.stringify(await q(sql`select label, host, port, active, is_default from mail_accounts`)));
  await db.execute(sql`update event set abstract_confirm_by = '2027-01-10T12:00:00+05:00', schedule_update_by = '2027-01-15T12:00:00+05:00', presenter_reg_by = '2027-01-20T12:00:00+05:00', sc_email = 'scientific@symposium2027.lnh.edu.pk' where id = 1`);
  const regs = await q(sql`select r.access_token t, r.reg_no, count(i.id)::int n from registrations r join registration_items i on i.registration_id = r.id where r.payment_status = 'PENDING' and r.has_pass and r.total_fee > 0 group by r.id order by n desc limit 1`);
  console.error("registration", JSON.stringify(regs));
  const pick = async (w: any) => (await q(w))[0];
  const oral = await pick(sql`select a.id, a.ref_no from abstracts a join session_people p on p.abstract_id = a.id where a.status='ACCEPTED' and coalesce(a.accepted_as,'ORAL') <> 'POSTER' limit 1`);
  const post = await pick(sql`select id, ref_no from abstracts where status='ACCEPTED' and accepted_as='POSTER' limit 1`);
  const rej = await pick(sql`select id, ref_no from abstracts where status='REJECTED' limit 1`);
  console.error("abstracts", JSON.stringify({ oral, post, rej }));
  await db.execute(sql`update abstracts set author_notified_at = now() where author_notified_at is null`);
  for (const a of [oral, post, rej].filter(Boolean)) await db.execute(sql`update abstracts set author_notified_at = null where id = ${a.id}`);
  if (post) await db.execute(sql`update abstracts set invite_status = 'NOT_SENT' where id = ${post.id}`);
  if (oral) await db.execute(sql`update session_people set invite_status = 'NOT_SENT' where abstract_id = ${oral.id}`);
  console.log(regs[0]?.t ?? "");
} else {
  console.log(JSON.stringify(await q(sql`select a.ref_no, a.accepted_as, a.invite_status, (select invite_status from session_people p where p.abstract_id = a.id limit 1) person_status from abstracts a where a.author_notified_at > now() - interval '30 minutes'`)));
}
process.exit(0);
