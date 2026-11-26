// r9: the stored settings row holds no readable credentials (server stopped)
const { db } = await import(process.cwd() + "/src/lib/db/index.ts");
const { sql } = await import("drizzle-orm");
const r: any = await db.execute(sql`select mode, secrets, updated_by from payment_settings`);
const row = (r.rows ?? r)[0] || {};
console.log(JSON.stringify({ mode: row.mode, by: row.updated_by, encrypted: /^v1\./.test(row.secrets || ""), plaintext: ["demo-secret-xyz-123", "Test_Merchant", "cb-password-12345", "demo-client-001"].filter((x) => (row.secrets || "").includes(x)) }));
process.exit(0);
