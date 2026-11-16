// 16 Nov 2026 PayPro fixes P1-P5 against the local PayPro stand-in (port 4555). Server stopped.
import path from "node:path"; import Module from "node:module"; import { pathToFileURL } from "node:url";
const stub = pathToFileURL(path.join(process.cwd(), "scripts/server-only-stub.cjs")).href;
(Module as any).registerHooks({ resolve: (spec: string, ctx: unknown, next: (s: string, c: unknown) => unknown) => (spec === "server-only" ? { url: stub, shortCircuit: true } : next(spec, ctx)) });
Object.assign(process.env, { PAYMENT_PROVIDER: "paypro", PAYPRO_BASE_URL: "http://localhost:4555/v2/ppro", PAYPRO_CLIENT_ID: "cid", PAYPRO_CLIENT_SECRET: "sec", PAYPRO_MERCHANT_ID: "m", PAYPRO_CALLBACK_USERNAME: "cbu", PAYPRO_CALLBACK_PASSWORD: "cbp" });
(async () => {
  const R = require("react"); if (!R.cache) R.cache = (f: any) => f;
  if (require("node:fs").existsSync(".env")) process.loadEnvFile(".env");
  const { db } = await import("../src/lib/db"); const { sql } = await import("drizzle-orm");
  const q = async (x: any) => { const r: any = await db.execute(x); return r.rows ?? r; };
  const ok = (name: string, cond: boolean, extra = "") => console.log(cond ? "PASS" : "FAIL", name, extra);
  await db.execute(sql`delete from payment_settings`).catch(() => {});
  await db.execute(sql`update event set registration_open = true, seat_hold_hours = 72, seat_hold_since = now() - interval '200 hours' where id = 1`);
  await db.execute(sql`insert into mail_settings (id, mode) values (1, 'LOG') on conflict (id) do update set mode = 'LOG'`);
  const { createRegistration } = await import("../src/lib/registration");
  const P = await import("../src/lib/payments"); const H = await import("../src/lib/seat-hold");
  const { POST: callback } = await import("../src/app/paypro/uis/route");
  const [cat] = await q(sql`select id, designations from fee_category where active and designations::text like '%Consultant%' limit 1`);
  const ws = await q(sql`select id from sessions where type='WORKSHOP' and registrable and status='APPROVED' and capacity is not null order by starts_at limit 6`);
  for (const w of ws) await db.execute(sql`update sessions set capacity = 500 where id = ${w.id}`);
  const mk = async (i: number, wsId: string) => {
    const email = `pp${i}-${Date.now()}@example.com`;
    const [a] = await q(sql`insert into accounts (id, email, password_hash, title, first_name, last_name, phone) values (gen_random_uuid(), ${email}, 'x', 'Dr.', ${"P" + i}, 'Test', '0300-1234567') returning id`);
    const r: any = await createRegistration({ title: "Dr.", gender: "Male", firstName: "P" + i, lastName: "Test", email, phone: "0300-1234567", whatsapp: "", cnic: "1111111111111", address: "Some address 1", city: "Karachi", province: "", country: "Pakistan", qualification: "", pmdcNo: "", specialty: "", designation: "Consultant", employeeNo: "", institution: "LNH", categoryId: cat.id, sessionIds: [wsId], consent: true, includePass: false, banquetQty: 0 } as any, { accountId: a.id, silent: true });
    const [row] = await q(sql`select id, total_fee from registrations where reg_no = ${r.regNo}`); return { ...r, id: row.id, fee: row.total_fee };
  };
  const mock = async (p: string) => (await fetch("http://localhost:4555" + p)).json();
  const bid = (url: string) => new URL(url).searchParams.get("bid")!;
  const cb = (ids: string, pw = "cbp") => callback(new Request("http://x/paypro/uis", { method: "POST", body: JSON.stringify({ username: "cbu", password: pw, csvinvoiceids: ids }) })).then((r) => r.json());

  // P3 + P2: one order reused; order expires with the seat hold
  const a = await mk(1, ws[0].id);
  const c1: any = await P.startCheckout(a.id), c2: any = await P.startCheckout(a.id);
  ok("P3 second click reuses the open order", c1.url === c2.url, bid(c1.url));
  ok("P3 one payment row", (await q(sql`select count(*)::int n from payments where registration_id = ${a.id}`))[0].n === 1);
  const orders: any[] = await mock("/_debug"); const o = orders.find(([id]) => id === bid(c1.url))[1];
  ok("P2 OrderExpireAfterSeconds ~ 72 h", Math.abs(Number(o.OrderExpireAfterSeconds) - 72 * 3600) < 120, `${o.OrderExpireAfterSeconds}s, due ${o.OrderDueDate}`);
  // P5: callback for an unpaid order is refused; after payment accepted
  const [pay] = await q(sql`select txn_ref from payments where registration_id = ${a.id}`);
  ok("P5 callback, wrong password refused", (await cb(pay.txn_ref, "bad"))[0].StatusCode === "01");
  ok("P5 callback for UNPAID order not confirmed", (await cb(pay.txn_ref))[0].StatusCode === "01" && (await q(sql`select payment_status from registrations where id = ${a.id}`))[0].payment_status === "PENDING");
  await mock(`/_markpaid?id=${bid(c1.url)}`);
  ok("P5 callback after payment confirms", (await cb(pay.txn_ref))[0].StatusCode === "00" && (await q(sql`select payment_status from registrations where id = ${a.id}`))[0].payment_status === "PAID");
  // P4: short payment not confirmed, flagged
  const b = await mk(2, ws[1].id); const cb1: any = await P.startCheckout(b.id);
  await mock(`/_markpaid?id=${bid(cb1.url)}&amt=${b.fee - 500}`);
  const [pb] = await q(sql`select txn_ref from payments where registration_id = ${b.id}`);
  const r4 = await P.checkPayPro(pb.txn_ref);
  const [fb] = await q(sql`select p.flag, r.payment_status from payments p join registrations r on r.id = p.registration_id where p.txn_ref = ${pb.txn_ref}`);
  ok("P4 short payment flagged, not confirmed", !r4?.paid && fb.flag === "SHORT" && fb.payment_status === "PENDING", JSON.stringify(fb));
  // P3: a second paid order for the same registration is flagged DUPLICATE
  const d = await mk(3, ws[2].id); const d1: any = await P.startCheckout(d.id);
  await db.execute(sql`update payments set raw = jsonb_set(raw, '{expiresAt}', to_jsonb(${new Date(Date.now() - 60e3).toISOString()}::text)) where registration_id = ${d.id}`);
  const d2: any = await P.startCheckout(d.id);
  ok("P3 expired order not reused", bid(d1.url) !== bid(d2.url));
  await mock(`/_markpaid?id=${bid(d1.url)}`); await mock(`/_markpaid?id=${bid(d2.url)}`);
  await P.reconcilePayPro();
  const dp = await q(sql`select status, flag from payments where registration_id = ${d.id} order by created_at`);
  ok("P3 second payment flagged DUPLICATE", dp.filter((x: any) => x.status === "PAID").length === 2 && dp.filter((x: any) => x.flag === "DUPLICATE").length === 1, JSON.stringify(dp));
  // P1: unpaid after 72 h -> cancelled, email, seats released; paid late with a seat free -> reinstated
  const e = await mk(4, ws[3].id); const e1: any = await P.startCheckout(e.id);
  await db.execute(sql`update registrations set created_at = now() - interval '73 hours' where id = ${e.id}`);
  const x = await H.expireUnpaid();
  const [er] = await q(sql`select payment_status from registrations where id = ${e.id}`);
  const mail = await q(sql`select status from notification_log where template_key = 'SEAT_HOLD_EXPIRED' and ref = ${e.regNo}`);
  ok("P1 expired after 72 h, email sent", er.payment_status === "FAILED" && mail.length === 1, JSON.stringify(x));
  await mock(`/_markpaid?id=${bid(e1.url)}`);
  const [pe] = await q(sql`select txn_ref from payments where registration_id = ${e.id}`);
  await db.execute(sql`update payments set status = 'PENDING' where txn_ref = ${pe.txn_ref}`); // PayPro still accepted it (late callback)
  await cb(pe.txn_ref);
  ok("P2 late payment, seat free: reinstated", (await q(sql`select payment_status from registrations where id = ${e.id}`))[0].payment_status === "PAID");
  // P2: late payment, workshop full -> LATE flag
  const f = await mk(5, ws[4].id); const f1: any = await P.startCheckout(f.id);
  await db.execute(sql`update registrations set created_at = now() - interval '73 hours' where id = ${f.id}`);
  await H.expireUnpaid();
  await db.execute(sql`update sessions set capacity = (select count(*) from registration_items i join registrations r on r.id = i.registration_id where i.session_id = ${ws[4].id} and r.payment_status in ('PENDING','PAID','WAIVED')) where id = ${ws[4].id}`);
  await mock(`/_markpaid?id=${bid(f1.url)}`);
  const [pf] = await q(sql`select txn_ref from payments where registration_id = ${f.id}`);
  await db.execute(sql`update payments set status = 'PENDING' where txn_ref = ${pf.txn_ref}`);
  await cb(pf.txn_ref);
  const [ff] = await q(sql`select p.flag, r.payment_status from payments p join registrations r on r.id = p.registration_id where p.txn_ref = ${pf.txn_ref}`);
  ok("P2 late payment, workshop full: LATE flag, stays cancelled", ff.flag === "LATE" && ff.payment_status === "FAILED", JSON.stringify(ff));
  // P1: paid just before expiry (no callback yet) is not cancelled
  const g = await mk(6, ws[5].id); const g1: any = await P.startCheckout(g.id);
  await db.execute(sql`update registrations set created_at = now() - interval '73 hours' where id = ${g.id}`);
  await mock(`/_markpaid?id=${bid(g1.url)}`);
  await H.expireUnpaid();
  ok("P1 paid at the bank before the job ran: confirmed, not cancelled", (await q(sql`select payment_status from registrations where id = ${g.id}`))[0].payment_status === "PAID");
  // reminder carries the pay-by sentence
  const note = await H.payByNote((await mk(7, ws[0].id)).id);
  ok("pay-by sentence", note.startsWith("Please pay by"), note);
  process.exit(0);
})();
