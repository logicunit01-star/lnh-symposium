// 17 Nov 2026 xNotify documents: template variables, no email, optional preferred_channel. Server stopped; mock on 4566.
import path from "node:path"; import Module from "node:module"; import { pathToFileURL } from "node:url";
const stub = pathToFileURL(path.join(process.cwd(), "scripts/server-only-stub.cjs")).href;
(Module as any).registerHooks({ resolve: (spec: string, ctx: unknown, next: (s: string, c: unknown) => unknown) => (spec === "server-only" ? { url: stub, shortCircuit: true } : next(spec, ctx)) });
(async () => {
  const R = require("react"); if (!R.cache) R.cache = (f: any) => f;
  if (require("node:fs").existsSync(".env")) process.loadEnvFile(".env");
  const { db, schema: s } = await import("../src/lib/db"); const { sql } = await import("drizzle-orm");
  const { sealText } = await import("../src/lib/secret-box"); const { XNOTIFY_LABEL, clearNotifyCache } = await import("../src/lib/notify-config");
  const v = { waEnabled: true, smsEnabled: false, apiUrl: "http://127.0.0.1:4566/v2/send", apiKey: sealText(XNOTIFY_LABEL, "k"), authId: null, authUsername: null, waChannel: "",
    templates: { REGISTRATION_CONFIRMED: { wa: "2730" }, WORKSHOP_CONFIRMED: { wa: "2731" } }, emailPerMin: 60, msgPerMin: 30, maxAttempts: 6 };
  await db.insert(s.notifySettings).values({ id: 1, ...v } as any).onConflictDoUpdate({ target: s.notifySettings.id, set: v as any }); clearNotifyCache();
  await db.execute(sql`insert into mail_settings (id, mode) values (1, 'LOG') on conflict (id) do update set mode = 'LOG'`);
  const r: any = await db.execute(sql`select r.id from registrations r where r.payment_status in ('PAID','WAIVED') and r.has_pass and exists (select 1 from registration_items i where i.registration_id = r.id) limit 1`);
  const reg = (r.rows ?? r)[0] ?? ((await db.execute(sql`select r.id from registrations r where r.payment_status in ('PAID','WAIVED') and exists (select 1 from registration_items i where i.registration_id = r.id) limit 1`)) as any).rows[0];
  const { sendRegistrationNotice } = await import("../src/lib/registration");
  await sendRegistrationNotice(reg.id, "paid");
  process.exit(0);
})();
