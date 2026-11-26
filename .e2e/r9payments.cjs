// Admin → Payments (Super Admin only): Off / Demo / Live switch with encrypted PayPro credentials. Needs .e2e/paypro-mock.cjs on 4555.
const { chromium } = require('playwright');
const B = 'http://localhost:3000', PW = 'ChangeMe!2026';
const tokens = process.argv.slice(2);
const out = (k, v) => console.log(k.padEnd(48), typeof v === 'string' ? v : JSON.stringify(v));
async function as(b, email) { const ctx = await b.newContext(); const r = await ctx.request.post(B + '/api/admin/login', { data: { email, password: PW } }); if (r.status() !== 200) throw new Error('login ' + email); return ctx; }
(async () => {
  const b = await chromium.launch();
  const sec = await as(b, 'secretariat@lnh.edu.pk'); const sp = await sec.newPage();
  await sp.goto(B + '/admin/payments'); out('secretariat blocked', { url: sp.url().replace(B, ''), menu: await sp.locator('aside a', { hasText: 'Payments' }).count() });
  const sa = await as(b, 'admin@lnh.edu.pk'); const p = await sa.newPage();
  const fresh = async () => { await p.goto(B + '/admin/payments'); };
  const save = async (re) => { await p.getByRole('button', { name: 'Save payment settings' }).click(); await p.waitForURL((u) => re.test(u.toString())); };
  await p.goto(B + '/admin/payments'); out('super admin sees menu + page', { menu: await p.locator('aside a', { hasText: 'Payments' }).count(), title: await p.locator('h1').first().innerText() });
  // Demo without credentials is refused
  await fresh(); await p.check('input[name=mode][value=DEMO]'); await save(/err=/);
  out('demo without credentials', await p.locator('p[role=alert]').innerText());
  // enter demo credentials + callback
  await fresh(); await p.check('input[name=mode][value=DEMO]');
  await p.fill('input[name=demo_baseUrl]', 'http://localhost:4555'); await p.fill('input[name=demo_clientId]', 'demo-client-001');
  await p.fill('input[name=demo_clientSecret]', 'demo-secret-xyz-123'); await p.fill('input[name=demo_merchantId]', 'Test_Merchant');
  await p.fill('input[name=cb_username]', 'cb-user-lnh'); await p.fill('input[name=cb_password]', 'cb-password-12345');
  await save(/saved=1/);
  const html = await p.content();
  out('saved; secrets never shown', { now: (await p.locator('text=/^Now:/').innerText()), secret: html.includes('demo-secret-xyz-123'), merchant: html.includes('Test_Merchant'), cbpass: html.includes('cb-password-12345'), idHint: html.includes('ends in …001') });
  await p.locator('button', { hasText: 'Test connection' }).first().click(); await p.waitForURL(/test=demo/);
  out('test connection (demo)', await p.locator('text=/Connected|did not accept/').innerText());
  // blank fields keep saved values
  await fresh(); await p.check('input[name=mode][value=DEMO]'); await save(/saved=1/);
  await p.locator('button', { hasText: 'Test connection' }).first().click(); await p.waitForURL(/test=demo/);
  out('blank fields keep saved values', await p.locator('text=/Connected|did not accept/').innerText());
  // checkout now goes to PayPro (demo set)
  const pub = await b.newContext();
  const c1 = await (await pub.request.post(`${B}/api/pay/${tokens[0]}`)).json();
  out('checkout uses PayPro demo', { kind: c1.kind, mock: (c1.url || '').startsWith('http://localhost:4555/pay') });
  const bid = new URL(c1.url).searchParams.get('bid'); const orders = await (await pub.request.get('http://localhost:4555/_debug')).json();
  const o = orders.find(([id]) => id === bid)[1]; out('order sent', { number: o.OrderNumber, merchant: o.merchant });
  const uis = async (u, pw) => (await (await pub.request.post(B + '/paypro/uis', { data: { username: u, password: pw, csvinvoiceids: o.OrderNumber } })).json())[0].StatusCode;
  out('callback with saved credentials', { right: await uis('cb-user-lnh', 'cb-password-12345'), wrong: await uis('cb-user-lnh', 'nope-nope-nope') });
  // Live: refused without credentials / confirmation
  await fresh(); await p.check('input[name=mode][value=LIVE]'); await save(/err=/);
  out('live without credentials', await p.locator('p[role=alert]').innerText());
  await fresh(); await p.check('input[name=mode][value=LIVE]'); await p.fill('input[name=live_baseUrl]', 'http://localhost:4555'); await p.fill('input[name=live_clientId]', 'cid');
  await p.fill('input[name=live_clientSecret]', 'sec'); await p.fill('input[name=live_merchantId]', 'Live_Merchant');
  await save(/err=/);
  out('live without confirmation', await p.locator('p[role=alert]').innerText());
  out('typed values cleared after redirect', await p.locator('input[name=live_clientId]').inputValue() === '');
  await fresh(); await p.check('input[name=mode][value=LIVE]'); await p.check('input[name=confirm_live]');
  await p.fill('input[name=live_baseUrl]', 'http://localhost:4555'); await p.fill('input[name=live_clientId]', 'cid'); await p.fill('input[name=live_clientSecret]', 'sec'); await p.fill('input[name=live_merchantId]', 'Live_Merchant'); await save(/saved=1/);
  const c2 = await (await pub.request.post(`${B}/api/pay/${tokens[1]}`)).json(); const o2 = (await (await pub.request.get('http://localhost:4555/_debug')).json()).at(-1)[1];
  out('live uses the live set', { kind: c2.kind, merchant: o2.merchant });
  // Off -> bank transfer
  await fresh(); await p.check('input[name=mode][value=OFF]'); await save(/saved=1/);
  const c3 = await (await pub.request.post(`${B}/api/pay/${tokens[2]}`)).json(); out('off -> bank transfer', c3.kind);
  const sp2 = await pub.newPage(); await sp2.goto(`${B}/register/success/${tokens[2]}`); out('success page: no Pay online button', await sp2.locator('button', { hasText: /online/ }).count());
  // back to the server settings file
  await fresh(); await p.check('input[name=mode][value=""]'); await save(/saved=1/);
  out('server file again', await p.locator('text=/^Now:/').innerText());
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
