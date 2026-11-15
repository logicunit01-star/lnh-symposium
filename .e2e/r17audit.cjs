// Audit fixes 16 Nov 2026 (server started WITHOUT PAYMENT_PROVIDER, so a production server falls back to manual).
const { chromium } = require('playwright'); const fs = require('fs');
const B = 'http://localhost:3000', PW = 'ChangeMe!2026', MAILS = process.argv[2];
const out = (k, v) => console.log(k.padEnd(54), typeof v === 'string' ? v : JSON.stringify(v));
const loginCtx = async (b, email, pw = PW) => { const c = await b.newContext(); const r = await c.request.post(B + '/api/admin/login', { data: { email, password: pw } }); return { c, status: r.status() }; };
(async () => {
  const b = await chromium.launch(); const pub = await b.newContext();
  // 1, 2: payments
  out('JazzCash callback (not the provider)', (await pub.request.post(B + '/api/payments/jazzcash/callback', { form: { pp_TxnRefNo: 'X', pp_ResponseCode: '000', pp_SecureHash: 'ABC' } })).status());
  out('test-payment endpoint without PAYMENT_PROVIDER', (await pub.request.post(B + '/api/payments/mock', { form: { txn: 'X', result: 'approve' } })).status());
  // 4: per-account sign-in limit (fake addresses do not help)
  let last = 0; for (let i = 0; i < 11; i++) last = (await pub.request.post(B + '/api/admin/login', { headers: { 'x-forwarded-for': `10.0.0.${i}` }, data: { email: 'wp.member@lnh.edu.pk', password: 'wrong' } })).status();
  out('11 wrong passwords, rotating fake addresses', last);
  // 3: department passcodes
  const sec = (await loginCtx(b, 'secretariat@lnh.edu.pk')).c; const sp = await sec.newPage();
  await sp.goto(B + '/admin/departments'); out('Secretariat sees "Create missing logins"', await sp.getByRole('button', { name: 'Create missing logins' }).count());
  // roles
  await sp.goto(B + '/admin/workshops/approvals'); out('Secretariat: approve buttons on workshops', await sp.getByRole('button', { name: /^Approve/ }).count());
  out('Secretariat: export registrations', (await sec.request.get(B + '/api/admin/export/registrations')).status());
  const view = (await loginCtx(b, 'viewer@lnh.edu.pk')).c;
  const scm = (await loginCtx(b, 'sc.member@lnh.edu.pk')).c; const sm = await scm.newPage();
  await sm.goto(B + '/admin/programme'); out('SC member: release programme button', await sm.getByRole('button', { name: /Release/i }).count());
  const scc = (await loginCtx(b, 'sc.chair@lnh.edu.pk')).c; const sc = await scc.newPage();
  await sc.goto(B + '/admin/programme'); out('SC Chair: release programme button', await sc.getByRole('button', { name: /Release|Unpublish|Withdraw/i }).count());
  // 5: abstract lookup by a department Head
  const hod = (await loginCtx(b, 'hod.cardiology@lnh.edu.pk')).c;
  const csv = await (await scc.request.get(B + '/api/admin/export/abstracts')).text(); const other = (csv.split('\n').find((l) => /ABS-\d{4}-\d+/.test(l) && !/Cardiology/.test(l)) || '').match(/ABS-\d{4}-\d+/)[0];
  out(`HOD Cardiology looks up ${other.trim()}`, await (await hod.request.get(B + '/api/admin/abstracts/lookup?ref=' + other.trim())).json().then((j) => j.message || (j.found ? 'FOUND (bad)' : 'not found')));
  // 10: final decision box (SC Chair)
  await sc.goto(B + '/admin/abstracts'); const href = await sc.locator('tbody tr', { hasText: 'SUBMITTED' }).first().locator('a[href^="/admin/abstracts/"]').first().getAttribute('href');
  await sc.goto(B + href); out('SC Chair: final decision box', await sc.locator('text=Final decision (Scientific Committee)').count());
  await sc.check('input[name=final][value=ACCEPT_POSTER]'); await sc.evaluate(() => document.querySelector('textarea[name=note]').removeAttribute('required')); await sc.getByRole('button', { name: 'Save final decision' }).click(); await sc.waitForURL(/err=|saved=/); out('…without a reason', await sc.locator('p[role=alert]').innerText().catch(() => 'no error'));
  await sc.check('input[name=final][value=ACCEPT_POSTER]'); await sc.fill('textarea[name=note]', 'Department window closed; committee decision'); await sc.getByRole('button', { name: 'Save final decision' }).click(); await sc.waitForURL(/saved=final/);
  out('…with a reason', (await sc.locator('text=Final decision saved').count()) + ' · history: ' + (await sc.locator('li', { hasText: 'Final decision by the Scientific Committee' }).first().innerText()).replace(/\s+/g, ' ').slice(0, 90));
  const smp = await scm.newPage(); await smp.goto(B + href); out('SC member: final decision box', await smp.locator('text=Final decision (Scientific Committee)').count());
  // 6: sign-in codes masked in the log, not redirected in Test mode
  const sa = (await loginCtx(b, 'admin@lnh.edu.pk')).c; const ap = await sa.newPage();
  await pub.request.post(B + '/api/account/code', { data: { email: (await sa.request.get(B + '/admin/users').then(() => 'none@example.com')), purpose: 'SIGNIN' } });
  await ap.goto(B + '/admin/emails?tab=log&tpl=SIGN_IN_CODE'); const row = await ap.locator('tbody tr').first().innerText().catch(() => '');
  out('sent log: sign-in code row', row.replace(/\s+/g, ' ').slice(0, 110));
  // 8: coordinator sidebar
  await ap.goto(B + '/admin/users?u=new'); await ap.fill('input[name=name]', 'Coord Test'); const ce = `coord${Date.now() % 100000}@lnh.edu.pk`; await ap.fill('input[name=email]', ce);
  await ap.selectOption('aside select[name=role]', 'DEPARTMENT'); await ap.selectOption('select[name=new_dept_0]', 'Nursing'); await ap.selectOption('select[name=new_role_0]', 'COORDINATOR'); await ap.fill('input[name=password]', 'Coordinator-2027!');
  await ap.getByRole('button', { name: 'Create login' }).click(); await ap.waitForURL(/saved=1|err=/);
  const co = await (await loginCtx(b, ce, 'Coordinator-2027!')).c.newPage(); await co.goto(B + '/admin/dept/sessions');
  out('Coordinator sidebar', await co.locator('nav a').allInnerTexts());
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
