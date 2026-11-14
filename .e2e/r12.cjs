// Part B: registration + workshop confirmations with inline QR; abstract decision emails with the confirm link; invite page wording; settings fields.
const { chromium } = require('playwright'); const fs = require('fs');
const B = 'http://localhost:3000', PW = 'ChangeMe!2026'; const [MAILFILE, TOKEN] = process.argv.slice(2);
const out = (k, v) => console.log(k.padEnd(44), typeof v === 'string' ? v : JSON.stringify(v));
const mails = () => (fs.existsSync(MAILFILE) ? fs.readFileSync(MAILFILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const hdr = (m, h) => (m.data.match(new RegExp(`^${h}: (.*(?:\\r?\\n[ \\t].*)*)`, 'mi')) || [])[1]?.replace(/\r?\n[ \t]+/g, ' ').trim();
const dec = (v) => (v || '').replace(/=\?utf-8\?Q\?(.*?)\?=/gi, (_, q) => q.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (__, h) => String.fromCharCode(parseInt(h, 16)))).replace(/=\?utf-8\?B\?(.*?)\?=/gi, (_, b) => Buffer.from(b, 'base64').toString()).replace(/\s+/g, ' ');
const html = (m) => { const p = m.data.split(/\r?\n--/).find((x) => /Content-Type: text\/html/i.test(x)) || ''; const body = p.split(/\r?\n\r?\n/).slice(1).join('\n'); return /quoted-printable/i.test(p) ? body.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))) : /base64/i.test(p.split(/\r?\n\r?\n/)[0]) ? Buffer.from(body.replace(/\s/g, ''), 'base64').toString() : body; };
(async () => {
  const b = await chromium.launch(); const pub = await b.newContext();
  let n0 = mails().length;
  const c = await (await pub.request.post(`${B}/api/pay/${TOKEN}`)).json(); const txn = new URL(c.url).searchParams.get('txn');
  await pub.request.post(B + '/api/payments/mock', { form: { txn, result: 'approve' }, maxRedirects: 0 });
  await new Promise((r) => setTimeout(r, 4000));
  for (const m of mails().slice(n0)) { const h = html(m); out('email: ' + dec(hdr(m, 'Subject')).slice(0, 60), { to: m.to, inlineQr: /cid:qr-/.test(h) && /Content-ID: <qr-/i.test(m.data), pdf: /application\/pdf/i.test(m.data), txn: /Transaction/i.test(h) ? (h.match(/Transaction[^<]*<\/[^>]+>\s*<[^>]+>([^<]+)/i) || [])[1] || 'line present' : '-', payment: (h.match(/(Paid|Complimentary)/) || [])[1] }); fs.writeFileSync(`/tmp/claude-0/m-${dec(hdr(m, 'Subject')).slice(0, 20).replace(/\W+/g, '_')}.html`, h); }
  // decisions
  const sa = await b.newContext(); await sa.request.post(B + '/api/admin/login', { data: { email: 'admin@lnh.edu.pk', password: PW } }); const p = await sa.newPage();
  await p.goto(B + '/admin/settings'); out('settings: new date fields', await p.locator('input[name=abstractConfirmBy],input[name=scheduleUpdateBy],input[name=presenterRegBy],input[name=scEmail]').count());
  out('settings: values', await p.locator('input[name=abstractConfirmBy]').inputValue() + ' / ' + await p.locator('input[name=scEmail]').inputValue());
  n0 = mails().length;
  await p.goto(B + '/admin/abstracts'); await p.getByRole('button', { name: /^Email \d+ decision/ }).click(); await p.waitForURL(/notified=/);
  out('decisions sent', p.url().split('notified=')[1]);
  await new Promise((r) => setTimeout(r, 1500));
  const links = [];
  for (const m of mails().slice(n0)) { const h = html(m); const l = (h.match(/href="([^"]*\/invite\/[^"]+)"/) || [])[1]; if (l) links.push(l);
    out('email: ' + dec(hdr(m, 'Subject')).slice(0, 60), { from: dec(hdr(m, 'From')).slice(0, 40), invite: !!l, confirmBy: /10 January 2027/.test(h), sc: /scientific@symposium2027/.test(h) }); fs.writeFileSync(`/tmp/claude-0/d-${dec(hdr(m, 'Subject')).slice(0, 24).replace(/\W+/g, '_')}.html`, h); }
  for (const l of links) { const ip = await pub.newPage(); await ip.goto(l.replace(/^https?:\/\/[^/]+/, B)); out('invite page', { buttons: await ip.locator('button[name=answer]').allInnerTexts(), sub: (await ip.locator('p').first().innerText()).slice(0, 80) });
    if (l === links[0]) { await ip.fill('textarea[name=note]', 'Prefer the afternoon of 27 Jan, clinic in the morning'); await ip.getByRole('button', { name: 'NOT AVAILABLE' }).click(); await ip.waitForLoadState(); out('answered not available', (await ip.locator('body').innerText()).match(/declin\w*|not available|thank[^.]*/i)?.[0]); }
    await ip.screenshot({ path: `/tmp/claude-0/inv-${links.indexOf(l)}.png`, fullPage: true }); }
  await p.goto(B + '/admin/emails?t=WORKSHOP_CONFIRMED'); out('admin template page: workshop confirmed', await p.locator('h2', { hasText: /Workshop registration confirmed/i }).count());
  await p.goto(B + '/admin/emails?t=ABSTRACT_ACCEPTED_POSTER'); out('admin template page: poster accepted', await p.locator('h2', { hasText: /poster/i }).count());
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
