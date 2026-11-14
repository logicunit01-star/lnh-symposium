// PayPro integration against the local stand-in (.e2e/paypro-mock.cjs). Tokens of 3 pending registrations as args.
const B = 'http://localhost:3000', M = 'http://localhost:4555';
const [t1, t2, t3] = process.argv.slice(2);
const out = (k, v) => console.log(k.padEnd(46), typeof v === 'string' ? v : JSON.stringify(v));
const start = async (t) => (await (await fetch(`${B}/api/pay/${t}`, { method: 'POST' })).json());
const follow = async (url) => { let u = url; for (let i = 0; i < 5; i++) { const r = await fetch(u, { redirect: 'manual' }); const l = r.headers.get('location'); if (!l) return u; u = new URL(l, u).toString(); if (u.includes('/register/success/')) return u; } return u; };
const uis = async (body) => (await (await fetch(`${B}/paypro/uis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json());
(async () => {
  let c = await start(t1); const d = c.data || c; out('checkout', { kind: d.kind, toPayPro: d.url?.startsWith(M + '/pay?bid='), hasCallback: d.url?.includes('callback_url=') });
  out('card failed -> return', (await follow(d.url + '&act=fail')).replace(B, ''));
  c = await start(t1); const d2 = c.data || c;
  out('card paid -> return', (await follow(d2.url + '&act=pay')).replace(B, ''));
  out('pay again after paid', await start(t1));
  // bank / ATM: PayPro calls /paypro/uis
  const c2 = await start(t2); const bid2 = new URL((c2.data || c2).url).searchParams.get('bid');
  const orders = await (await fetch(M + '/_debug')).json(); const txn2 = orders.find(([id]) => id === bid2)[1].OrderNumber;
  out('uis no password', await uis({ username: 'ppuser', csvinvoiceids: txn2 }));
  out('uis wrong password', await uis({ username: 'ppuser', password: 'nope', csvinvoiceids: txn2 }));
  out('uis ok + unknown', await uis({ username: 'ppuser', password: 'pp-pass-123', csvinvoiceids: `${txn2},NOPE-1` }));
  out('uis repeat (idempotent)', await uis({ username: 'ppuser', password: 'pp-pass-123', csvinvoiceids: txn2 }));
  // missed callback: the daily cron asks PayPro
  const c3 = await start(t3); const bid3 = new URL((c3.data || c3).url).searchParams.get('bid');
  await fetch(`${M}/_markpaid?id=${bid3}`);
  const cron = await (await fetch(`${B}/api/cron/reminders`, { headers: { Authorization: 'Bearer test-cron' } })).json();
  out('cron reconcile', cron.payPro);
  out('order sent to PayPro', (await (await fetch(M + '/_debug')).json()).at(-1)[1]);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
