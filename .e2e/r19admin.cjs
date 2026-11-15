// Admin audit fixes (16 Nov 2026): demo reset, check-in rules, certificates, sessions editor, cancelled workshop, seat cap, onsite waiver, mark paid twice, staff messages.
const { chromium } = require('playwright'); const fs = require('fs');
const B = 'http://localhost:3000', PW = 'ChangeMe!2026', MAILS = process.argv[2];
const out = (k, v) => console.log(k.padEnd(52), typeof v === 'string' ? v : JSON.stringify(v));
const mails = () => fs.readFileSync(MAILS, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const subj = (m) => ((m.data.match(/^Subject: (.*(?:\r?\n[ \t].*)*)/mi) || [])[1] || '').replace(/\r?\n[ \t]+/g, ' ').replace(/=\?utf-8\?Q\?(.*?)\?=/gi, (_, q) => q.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (__, h) => String.fromCharCode(parseInt(h, 16)))).replace(/\s+/g, ' ');
const alert = async (p) => (await p.locator('p[role=alert]').first().innerText().catch(() => 'none')).slice(0, 100);
(async () => {
  const b = await chromium.launch(); const c = await b.newContext(); await c.request.post(B + '/api/admin/login', { data: { email: 'admin@lnh.edu.pk', password: PW } }); const p = await c.newPage();
  await p.goto(B + '/admin/settings'); out('1. "Reset demo content" on Event Settings', await p.getByRole('button', { name: 'Reset demo content' }).count());
  // registrations: one pending with a symposium registration
  await p.goto(B + '/admin/registrations?status=PENDING'); const pend = await p.locator('tbody tr a[href^="/admin/registrations/"]').first().getAttribute('href');
  await p.goto(B + pend); await p.getByRole('button', { name: 'Check in now' }).click(); await p.waitForURL(/err=/); out('2. check in an unpaid registration', await alert(p));
  // mark paid, then again (second form submit simulated by a second POST from a stale page)
  const stale = await c.newPage(); await stale.goto(B + pend);
  await p.goto(B + pend); await p.getByRole('button', { name: /Mark as paid/ }).click(); await p.waitForLoadState('networkidle');
  await stale.getByRole('button', { name: /Mark as paid/ }).click(); await stale.waitForURL(/err=/).catch(() => {}); out('9. second "Mark as paid"', await alert(stale));
  await p.goto(B + pend); out('9. staff actions on the registration', (await p.locator('text=Staff actions').locator('..').innerText().catch(() => '-')).replace(/\s+/g, ' ').slice(0, 120));
  // certificates before the event ends
  await p.goto(B + '/admin/communications'); out('3. eligible line', (await p.locator('text=/eligible now/').innerText()).slice(0, 110));
  await p.getByRole('button', { name: 'Issue certificates' }).click(); await p.waitForURL(/err=|issued=/); out('12. issue before the end, no tick', await alert(p));
  // sessions editor
  await p.goto(B + '/admin/sessions/new'); out('4. department is a picker', await p.locator('select[name=department]').count() + ' · WORKSHOP type offered: ' + await p.locator('select[name=type] option', { hasText: 'WORKSHOP' }).count());
  await p.fill('input[name=title]', 'Audit test'); await p.fill('input[name=start]', '11:00'); await p.fill('input[name=end]', '10:00'); await p.getByRole('button', { name: /Save|Create/ }).first().click(); await p.waitForURL(/err=/); out('4. end before start', await alert(p));
  await p.goto(B + '/admin/workshops'); const wsHref = await p.locator('tbody a[href^="/admin/workshops/"]').first().getAttribute('href'); const wsId = wsHref.split('/').pop();
  await p.goto(B + `/admin/sessions/${wsId}/edit`); out('4. editing a workshop in Sessions goes to', new URL(p.url()).pathname);
  // seat cap below sold: find a workshop with registrations
  await p.goto(B + '/admin/sessions'); const rows = await p.locator('tbody tr').all(); let sold = null;
  for (const r of rows) { const t = await r.innerText(); if (/Workshop/i.test(t) && /\b[1-9]\d*\s*\/\s*\d+/.test(t)) { sold = await r.locator('a[href^="/admin/sessions/"]').first().getAttribute('href'); break; } }
  if (sold) { const id = sold.split('/').pop(); await p.goto(B + `/admin/workshops/${id}/edit`); if (await p.locator('input[name=capacity]').count()) { await p.fill('input[name=capacity]', '1'); await p.getByRole('button', { name: /Save|Submit|Update/ }).last().click(); await p.waitForTimeout(2500); out('7. seat cap 1 on a workshop with registrations', (await p.locator('[role=alert], .text-rose-800, .text-rose-700').first().innerText().catch(() => 'no error')).slice(0, 100)); } else out('7. seat cap', 'workshop locked for editing'); }
  else out('7. seat cap', 'no workshop with registrations found');
  // staff message: confirmation required, then progress
  await p.goto(B + '/admin/communications'); await p.selectOption('select[name=audience]', 'PENDING'); await p.evaluate(() => document.querySelector('input[name=confirm]').removeAttribute('required'));
  await p.getByRole('button', { name: 'Send now' }).click(); await p.waitForURL(/err=|batch=/); out('10. send without the confirmation tick', await alert(p));
  await p.selectOption('select[name=audience]', 'PENDING'); await p.fill('input[name=subject]', 'Audit <b>test</b>'); await p.check('input[name=confirm]'); await p.getByRole('button', { name: 'Send now' }).click(); await p.waitForURL(/batch=/);
  await p.waitForSelector('text=/Finished/', { timeout: 120000 }); out('10. progress', await p.locator('text=/Finished/').innerText());
  const m = mails().filter((x) => /Audit/.test(subj(x))).at(-1); out('11. subject/HTML escaped', m ? (/<b>test<\/b>/.test(m.data) ? 'NOT escaped' : 'escaped') : 'no mail');
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
