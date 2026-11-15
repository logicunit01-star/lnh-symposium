// 0022 check (server stopped): departments needing review, memberships, roles, FK refusals
const { db } = await import(process.cwd() + "/src/lib/db/index.ts");
const { sql } = await import("drizzle-orm");
const q = async (x: any) => { const r: any = await db.execute(x); return r.rows ?? r; };
console.log("needs review:", JSON.stringify(await q(sql`select name, active from departments where needs_review`)));
console.log("committee:", JSON.stringify(await q(sql`select name, kind from departments where kind = 'COMMITTEE'`)));
console.log("roles:", JSON.stringify(await q(sql`select role, count(*)::int n from users group by 1 order by 1`)));
console.log("memberships:", JSON.stringify(await q(sql`select ud.department, ud.role, u.email from user_departments ud join users u on u.id = ud.user_id`)));
console.log("contributors:", JSON.stringify(await q(sql`select count(*)::int n from session_departments`)));
try { await db.execute(sql`update sessions set department = 'Cardiolgy' where id = (select id from sessions where department is not null limit 1)`); console.log("FK: typo ACCEPTED (bad)"); } catch (e: any) { console.log("FK: typo refused", String(e.message).slice(0, 80)); }
const [x] = await q(sql`select count(*)::int n from sessions where department = 'Cardiology'`);
await db.execute(sql`update departments set name = 'Cardiology (Adult)' where name = 'Cardiology'`);
const [y] = await q(sql`select count(*)::int n from sessions where department = 'Cardiology (Adult)'`);
const [z] = await q(sql`select count(*)::int n from user_departments where department = 'Cardiology (Adult)'`);
console.log("rename cascade:", x.n, "->", y.n, "sessions; memberships", z.n);
await db.execute(sql`update departments set name = 'Cardiology' where name = 'Cardiology (Adult)'`);
process.exit(0);
