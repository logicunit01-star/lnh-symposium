// Part C on PostgreSQL with NOTIFIER=worker: the website only queues; scripts/notifier.ts sends with limits. Steps: setup | pay | page
const { chromium } = require('playwright'); const fs = require('fs');
const B = 'http://localhost:3000', PW = 'ChangeMe!2026'; const [step, XN, TOKEN] = process.argv.slice(2);
const out = (k, v) => console.log(k.padEnd(40), typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(); await ctx.request.post(B + '/api/admin/login', { data: { email: 'admin@lnh.edu.pk', password: PW } }); const p = await ctx.newPage();
  if (step === 'setup') {
    await p.goto(B + '/admin/messaging');
    await p.check('input[name=waEnabled]'); await p.check('input[name=smsEnabled]');
    await p.fill('input[name=apiUrl]', 'http://127.0.0.1:4566/v2/send'); await p.fill('input[name=apiKey]', 'test-key-abc-123'); await p.fill('input[name=authId]', '777'); await p.fill('input[name=authUsername]', 'lnh_symposium');
    await p.fill('input[name=wa_REGISTRATION_CONFIRMED]', '101'); await p.fill('input[name=wa_WORKSHOP_CONFIRMED]', '102'); await p.fill('input[name=sms_REGISTRATION_CONFIRMED]', '201');
    await p.fill('input[name=msgPerMin]', '2');
    await p.getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForURL(/saved=1/); out('settings saved', 'msgPerMin 2');
  }
  if (step === 'pay') {
    const t0 = Date.now(); const pub = await b.newContext();
    const c = await (await pub.request.post(`${B}/api/pay/${TOKEN}`)).json(); const txn = new URL(c.url).searchParams.get('txn');
    await pub.request.post(B + '/api/payments/mock', { form: { txn, result: 'approve' }, maxRedirects: 0 });
    out('payment confirmed in ms', Date.now() - t0);
  }
  if (step === 'page') {
    await p.goto(B + '/admin/messaging');
    out('status tiles', (await p.locator('.a-card').first().innerText()).replace(/\s+/g, ' '));
    out('waiting', (await p.locator('.a-card').nth(1).innerText()).replace(/\s+/g, ' '));
    await p.screenshot({ path: '/tmp/claude-0/messaging-w.png' });
  }
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
