// R19 C-3: venue and date rules on the HOD workshop request form. Superseded by .e2e/r7.cjs (13 Nov: workshop rooms and window changed)
const { chromium } = require('playwright');
const B = 'http://localhost:3000', PW = 'ChangeMe!2026';
const out = (k, v) => console.log(k.padEnd(52), typeof v === 'string' ? v : JSON.stringify(v));
async function as(b, email) { const ctx = await b.newContext({ viewport: { width: 1366, height: 1000 } }); const r = await ctx.request.post(B + '/api/admin/login', { data: { email, password: PW } }); if (r.status() !== 200) throw new Error('login ' + email + ' ' + r.status()); return ctx; }
(async () => {
  const b = await chromium.launch();
  const hod = await as(b, 'hod.anesthesia@lnh.edu.pk'); const p = await hod.newPage();
  await p.goto(B + '/admin/workshops/new');
  const dateIn = p.locator('input[name=date]');
  out('min date = today or later', { min: await dateIn.getAttribute('min'), today: new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10) });
  await dateIn.fill('2026-12-13'); // Sunday
  out('Sunday refused + submit off', { msg: await p.getByText('Sundays are not available').count(), disabled: await p.getByRole('button', { name: 'Submit for review' }).isDisabled() });
  await dateIn.fill('2026-11-02');
  out('past date refused', await p.getByText(/This date has passed|inside the workshop window/).count());
  await dateIn.fill('2026-12-14');
  await p.locator('select[name=duration]').selectOption('180'); await p.getByLabel('Start time').selectOption('09:00');
  out('duration sets end (09:00 + 3 h)', (await p.locator('text=/^\\d{2}:\\d{2}$/').allInnerTexts()).includes('12:00'));
  const skill = await p.locator('select[name=venueId] option', { hasText: 'Skill Lab' }).first().getAttribute('value');
  await p.locator('select[name=venueId]').selectOption(skill);
  await p.getByRole('dialog').waitFor({ timeout: 5000 }).catch(() => {});
  out('clash shown beside room + pop-up opened', { inline: await p.getByText(/is already booked .* for “/).count() > 0, dialog: await p.getByRole('dialog').count() });
  const dlg = p.getByRole('dialog'); const t = await dlg.innerText();
  out('pop-up lists free rooms and dates', { rooms: (await dlg.getByRole('button', { name: 'Use this room' }).count()), dates: (t.match(/free \d{2}:\d{2}–\d{2}:\d{2} on/) ? (await dlg.locator('button.a-btn-ghost').count()) - (await dlg.getByRole('button', { name: 'Use this room' }).count()) : 0), noSunday: !/Sun /.test(t) });
  await dlg.getByRole('button', { name: 'Use this room' }).first().click();
  await p.waitForTimeout(800);
  out('after picking a free room: green + submit on', { free: await p.getByText(/is free on/).count(), disabled: await p.getByRole('button', { name: 'Submit for review' }).isDisabled() });
  await p.locator('input[name=title]').fill('R4 rules test workshop'); await p.locator('textarea[name=description]').fill('Test');
  await p.locator('input[name=leadFaculty]').fill('Dr. Rules Test');
  await p.getByRole('button', { name: 'Submit for review' }).click(); await p.waitForURL(/saved=1/, { timeout: 15000 }).catch(() => {});
  out('request saved', /saved=1/.test(p.url()));
  // API direct: clash for the same room/time now that it is booked
  const r = await hod.request.get(B + `/api/admin/workshops/availability?date=2026-12-14&start=09:00&end=12:00&venueId=${skill}`);
  out('API clash for Skill Lab', !!(await r.json()).clash);
  // matrix: date filter only upcoming, no simulate date for HOD
  await p.goto(B + '/admin/workshops'); const opts = await p.locator('select[name=day] option').allInnerTexts();
  out('HOD matrix: date filter, no simulate', { n: opts.length - 1, simulate: await p.locator('input[name=asOf]').count() });
  const com = await as(b, 'admin@lnh.edu.pk'); const c = await com.newPage(); await c.goto(B + '/admin/workshops');
  out('committee still has simulate date', await c.locator('input[name=asOf]').count());
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
