// 23 Nov 2026: OTP by SMS (xNotify template 2780). Server stopped; mock on 4566 writing to argv[2].
import path from "node:path"; import Module from "node:module"; import { pathToFileURL } from "node:url"; import fs from "node:fs";
const stub = pathToFileURL(path.join(process.cwd(), "scripts/server-only-stub.cjs")).href;
(Module as any).registerHooks({ resolve: (spec: string, ctx: unknown, next: (s: string, c: unknown) => unknown) => (spec === "server-only" ? { url: stub, shortCircuit: true } : next(spec, ctx)) });
(async () => {
  const R = require("react"); if (!R.cache) R.cache = (f: any) => f;
  if (fs.existsSync(".env")) process.loadEnvFile(".env");
  const OUT = process.argv[2]; const lines = () => fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const { db, schema: s } = await import("../src/lib/db"); const { sql, desc } = await import("drizzle-orm");
  const { sealText } = await import("../src/lib/secret-box"); const { XNOTIFY_LABEL, clearNotifyCache } = await import("../src/lib/notify-config");
  const set = async (tpl: Record<string, any>) => { const v = { waEnabled: true, smsEnabled: false, apiUrl: "http://127.0.0.1:4566/v2/send", apiKey: sealText(XNOTIFY_LABEL, "k"), authId: null, authUsername: null, waChannel: "Whatsapp",
    templates: tpl, emailPerMin: 60, msgPerMin: 30, maxAttempts: 6 };
    await db.insert(s.notifySettings).values({ id: 1, ...v } as any).onConflictDoUpdate({ target: s.notifySettings.id, set: v as any }); clearNotifyCache(); };
  await db.execute(sql`insert into mail_settings (id, mode) values (1, 'LOG') on conflict (id) do update set mode = 'LOG'`);
  const otp = await import("../src/lib/otp");
  const last = async () => (await db.select().from(s.notificationLog).orderBy(desc(s.notificationLog.createdAt)).limit(1))[0];

  await set({ REGISTRATION_CONFIRMED: { wa: "2730" } }); // no OTP template: no SMS
  let n0 = lines().length; await otp.issueOtp("SIGNIN", "a@x.com", { email: "a@x.com", phone: "0300-1234567" });
  console.log("1 without template: sms sent =", lines().length - n0, "| sentTo:", await otp.sentToText({ email: "a@x.com", phone: "0300-1234567" }));

  await set({ REGISTRATION_CONFIRMED: { wa: "2730" }, SIGN_IN_CODE: { wa: "2780" } });
  n0 = lines().length; const o = await otp.issueOtp("SIGNIN", "a@x.com", { email: "a@x.com", phone: "0300-1234567" });
  const rec = lines().slice(n0); console.log("2 body:", JSON.stringify(rec[0]?.body), "| key header:", rec[0]?.key);
  const v = await otp.verifyOtp(o.id, "SIGNIN", rec[0]?.body?.otp); console.log("  code in SMS verifies:", "row" in v);
  const l = await last(); console.log("  log:", l.channel, l.status, "|", l.body, "| payload kept:", l.payload !== null, "| sentTo:", await otp.sentToText({ email: "a@x.com", phone: "0300-1234567" }));
  console.log("  code visible in log:", /\b\d{6}\b/.test(l.body), "| email log subject masked:", ((await db.execute(sql`select subject from notification_log where channel='EMAIL' order by created_at desc limit 1`)) as any).rows[0].subject);

  n0 = lines().length; await otp.issueOtp("SIGNUP", "b@x.com", { email: "b@x.com", phone: "+971 501234567" });
  console.log("3 intl to:", lines().slice(n0)[0]?.body?.to);

  await fetch("http://127.0.0.1:4566/fail-on", { method: "POST" });
  await otp.issueOtp("RESET", "a@x.com", { email: "a@x.com", phone: "03001234567" });
  const f = await last(); console.log("4 failure:", f.status, "| attempts", f.attempts, "| next retry", f.nextAttemptAt, "| payload kept:", f.payload !== null, "| error:", f.error?.slice(0, 60));
  await fetch("http://127.0.0.1:4566/fail-off", { method: "POST" });

  // regular WhatsApp messages still carry preferred_channel
  const { sendMessage } = await import("../src/lib/notify");
  n0 = lines().length; await sendMessage("REGISTRATION_CONFIRMED", "03001234567", { vars: { participant_name: "T" } });
  console.log("5 registration message body:", JSON.stringify(lines().slice(n0)[0]?.body));
  process.exit(0);
})();
