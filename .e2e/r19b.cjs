// 16 Nov 2026 audit fixes, part 2: seat cap, cancelled workshop, workshop attendance, onsite waiver.
const { chromium } = require('playwright'); const fs = require('fs');
const B = 'http://localhost:3000', PW = 'ChangeMe!2026', MAILS = process.argv[2];
const out = (k, v) => console.log(k.padEnd(52), typeof v === 'string' ? v : JSON.stringify(v));
const nMails = () => fs.readFileSync(MAILS, 'utf8').trim().split('\n').length;
(async () => {
  const b = await chromium.launch(); const c = await b.newContext(); await c.request.post(B + '/api/admin/login', { data: { email: 'admin@lnh.edu.pk', password: PW } }); const p = await c.newPage();
  // a workshop with registrations (Trauma Team Simulation: 16 of 30 in the demo data)
  const ses = 'b3e6625a-09d7-4016-908f-499552902f0c';
  await p.goto(B + `/admin/sessions/${ses}`);
  const regLink = await p.locator('tbody a[href^="/admin/registrations/"]').first().getAttribute('href');
  // 5. workshop attendance does not check in to the symposium
  const markBtn = p.locator('tbody tr', { has: p.locator(`a[href="${regLink}"]`) }).locator('button').first();
  await p.goto(B + regLink); const before = await p.locator('button', { hasText: /Check in now|Undo check-in/ }).first().innerText();
  await p.goto(B + `/admin/sessions/${ses}`); const t0 = await markBtn.innerText();
  if (/Mark attended|Mark/i.test(t0)) { await markBtn.click(); await p.waitForTimeout(2000); }
  await p.goto(B + regLink); out('5. symposium check-in after workshop "attended"', `${before} -> ${await p.locator('button', { hasText: /Check in now|Undo check-in/ }).first().innerText()} (attendance button was "${t0.trim()}")`);
  // 7. seat cap below registrations
  await p.goto(B + `/admin/workshops/${ses}/edit`); await p.fill('input[name=capacity]', '1');
  await p.locator('form button[type=submit], form button:not([type])').filter({ hasText: /Save|Submit|Update/ }).last().click(); await p.waitForTimeout(3000);
  out('7. seat cap 1', (await p.locator('text=/already registered/').first().innerText().catch(() => 'no message')).slice(0, 110));
  // 6. cancel the workshop
  const m0 = nMails(); await p.goto(B + `/admin/workshops/${ses}`);
  const slug = await p.evaluate(() => (document.querySelector('a[href^="/workshops/"]') || {}).getAttribute?.('href') || '');
  const cancelForm = p.locator('form', { has: p.locator('select[name=decision], input[name=decision]') }).first();
  if (await p.locator('select[name=decision]').count()) { await p.selectOption('select[name=decision]', 'CANCEL'); await cancelForm.locator('button').first().click(); }
  else { await p.locator('button[name=decision][value=CANCEL]').first().click(); }
  await p.waitForTimeout(3000); await p.goto(B + `/admin/workshops/${ses}`);
  out('6. after Cancel', (await p.locator('text=/Cancelled: hidden/').innerText().catch(() => 'no note')).slice(0, 80) + ` · emails sent: ${nMails() - m0}`);
  const pub = await (await b.newContext()).newPage(); await pub.goto(B + '/workshops'); const title = await p.locator('h1').innerText();
  out('6. still in the public catalogue', await pub.locator(`text=${title.slice(0, 30)}`).count());
  // undo: Run
  if (await p.locator('select[name=decision]').count()) { await p.selectOption('select[name=decision]', 'RUN'); await p.locator('form', { has: p.locator('select[name=decision]') }).first().locator('button').first().click(); } else await p.locator('button[name=decision][value=RUN]').first().click();
  await p.waitForTimeout(2000);
  // 8. onsite waiver sends the confirmation
  const m1 = nMails(); await p.goto(B + '/admin/onsite');
  out('8. onsite form present', await p.locator('input[name=firstName]').count());
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
