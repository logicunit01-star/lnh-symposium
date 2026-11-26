// r10 prep (server stopped): remove test mailboxes, sender settings and delivery mode
const { db } = await import(process.cwd() + "/src/lib/db/index.ts");
const { sql } = await import("drizzle-orm");
await db.execute(sql`delete from mail_accounts`); await db.execute(sql`delete from mail_settings`);
await db.execute(sql`update email_templates set account_id = null, from_name = null, cc = null, reply_to = null`);
console.log("ok"); process.exit(0);
