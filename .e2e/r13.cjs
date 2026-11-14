// Part C: WhatsApp & SMS settings (Super Admin), eOcean calls with QR images, public QR links, outbox retries. Needs .e2e/xnotify-mock.cjs (4566) and smtp-sink (2525).
const { chromium } = require('playwright'); const fs = require('fs');
const B = 'http://localhost:3000', PW = 'ChangeMe!2026'; const [XN, MAILS, TOKEN] = process.argv.slice(2);
const out = (k, v) => console.log(k.padEnd(46), typeof v === 'string' ? v : JSON.stringify(v));
const calls = () => (fs.existsSync(XN) ? fs.readFileSync(XN, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const mails = () => (fs.existsSync(MAILS) ? fs.readFileSync(MAILS, 'utf8').trim().split('\n').filter(Boolean).length : 0);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function as(b, email) { const ctx = await b.newContext(); const r = await ctx.request.post(B + '/api/admin/login', { data: { email, password: PW } }); if (r.status() !== 200) throw new Error('login ' + email); return ctx; }
(async () => {
  const b = await chromium.launch();
  const adm = await (await as(b, 'secretariat@lnh.edu.pk')).newPage(); await adm.goto(B + '/admin/messaging'); out('non-super-admin blocked', adm.url().includes('denied=1'));
  const p = await (await as(b, 'admin@lnh.edu.pk')).newPage();
  await p.goto(B + '/admin/messaging'); out('page opens', await p.locator('h1', { hasText: 'WhatsApp & SMS' }).count());
  // switching on without credentials is refused
  await p.check('input[name=waEnabled]'); await p.getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForURL(/err=/); out('on without key refused', (await p.locator('p[role=alert]').innerText()).slice(0, 70));
  await p.goto(B + '/admin/messaging');
  await p.check('input[name=waEnabled]'); await p.check('input[name=smsEnabled]');
  await p.fill('input[name=apiUrl]', 'http://127.0.0.1:4566/v2/send'); await p.fill('input[name=apiKey]', 'test-key-abc-123'); await p.fill('input[name=authId]', '777'); await p.fill('input[name=authUsername]', 'lnh_symposium');
  await p.fill('input[name=wa_REGISTRATION_CONFIRMED]', '101'); await p.fill('input[name=wa_WORKSHOP_CONFIRMED]', '102'); await p.fill('input[name=sms_REGISTRATION_CONFIRMED]', '201');
  await p.getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForURL(/saved=1/);
  out('saved; key not in page', { hidden: !(await p.content()).includes('test-key-abc-123'), hint: await p.locator('input[name=apiKey]').getAttribute('placeholder') });
  // registration confirmed by (mock) payment -> WhatsApp with QR images + SMS template
  const pub = await b.newContext(); let c0 = calls().length, m0 = mails();
  const c = await (await pub.request.post(`${B}/api/pay/${TOKEN}`)).json(); const txn = new URL(c.url).searchParams.get('txn');
  await pub.request.post(B + '/api/payments/mock', { form: { txn, result: 'approve' }, maxRedirects: 0 }); await wait(4000);
  const got = calls().slice(c0);
  out('eOcean calls after payment', got.map((x) => ({ tpl: x.body.message_template_id, ch: x.body.preferred_channel, to: x.body.to, media: x.media ? `${x.media.status} ${x.media.type} png=${x.media.png}` : null })));
  out('headers', { key: got[0]?.key, auth: got[0]?.auth });
  out('emails still sent', mails() - m0);
  // QR link without / with a wrong key
  const qr = got.find((x) => x.body.pdf_url)?.body.pdf_url || '';
  const u = new URL(qr); out('QR link shape', u.pathname.replace(/[0-9a-f-]{20,}/, '<id>'));
  out('QR without key', (await pub.request.get(B + u.pathname)).status());
  out('QR with wrong key', (await pub.request.get(B + u.pathname + '?k=' + 'x'.repeat(32))).status());
  out('QR other id, same key', (await pub.request.get(B + u.pathname.replace(/\/[^/]+\.png$/, '/00000000-0000-0000-0000-000000000000.png') + u.search)).status());
  // failure -> queued with retry; then "Send now"
  await fetch('http://127.0.0.1:4566/fail-on', { method: 'POST' });
  await p.goto(B + '/admin/messaging'); await p.fill('input[name=phone]', '0300 1234567'); await p.selectOption('select[name=key]', 'REGISTRATION_CONFIRMED');
  await p.getByRole('button', { name: 'Send test' }).click(); await p.waitForURL(/test=/); out('test while eOcean fails', await p.locator('text=/WHATSAPP|SMS|Nothing/').first().innerText());
  out('queue shows it', (await p.locator('table').first().locator('tbody tr').first().innerText()).replace(/\s+/g, ' ').slice(0, 160));
  await fetch('http://127.0.0.1:4566/fail-off', { method: 'POST' });
  await p.getByRole('button', { name: 'Send now' }).first().click(); await p.waitForURL(/q=1/); await p.goto(B + '/admin/messaging');
  out('after Send now: waiting', await p.locator('text=Nothing waiting').count() ? 'queue empty' : (await p.locator('table').first().locator('tbody tr').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').slice(0, 90)));
  out('recent list', (await p.locator('table').nth(2).locator('tbody tr').allInnerTexts()).slice(0, 3).map((t) => t.replace(/\s+/g, ' ').slice(0, 100)));
  await p.screenshot({ path: '/tmp/claude-0/messaging.png', fullPage: true });
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
