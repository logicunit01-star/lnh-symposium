// R21: Workshop Decisions and New Requirements (LNH answers 13 Nov 2026). Args: JSON from .e2e/r7prep.mts
const { chromium } = require('playwright');
const B = 'http://localhost:3000', PW = 'ChangeMe!2026';
const P = JSON.parse(process.argv[2]);
const out = (k, v) => console.log(k.padEnd(50), typeof v === 'string' ? v : JSON.stringify(v));
async function as(b, email) { const ctx = await b.newContext({ viewport: { width: 1366, height: 1000 } }); const r = await ctx.request.post(B + '/api/admin/login', { data: { email, password: PW } }); if (r.status() !== 200) throw new Error('login ' + email + ' ' + r.status()); return ctx; }
const api = async (ctx, url, body) => { const r = await ctx.request.post(B + url, { data: body }); return { status: r.status(), j: await r.json().catch(() => null) }; };
async function fillForm(p, o) {
  await p.fill('input[name=title]', o.title); await p.fill('input[name=organiser]', 'Dr. Organiser Test');
  await p.selectOption('select[name=mode]', o.mode || 'ONSITE');
  await p.fill('textarea[name=objectives]', '1. Apply lung-protective ventilation\n2. Perform bedside ultrasound');
  await p.fill('input[name=targetAudience]', 'Residents and ICU nurses');
  await p.fill('textarea[name=prelimProgramme]', '09:00 Registration\n09:30 Ventilation basics');
  await p.fill('input[name=date]', o.date);
  await p.selectOption('select[name=duration]', String(o.dur));
  if (o.venue) { const v = (await p.locator('select[name=venueId] option').allTextContents()).find((x) => x.startsWith(o.venue)); await p.selectOption('select[name=venueId]', { label: v }); }
  await p.fill('input[name=capacity]', '30');
  await p.fill('input[name=leadFaculty]', 'Dr. Director Test');
  await p.fill('textarea[name=facilitatorNames]', 'Dr. Facilitator One\nMs. Facilitator Two, RN');
  await p.waitForTimeout(900);
}
(async () => {
  const b = await chromium.launch();
  const hod = await as(b, 'hod.anesthesia@lnh.edu.pk'); const p = await hod.newPage();
  await p.goto(B + '/admin/workshops/new');
  const opts = await p.locator('select[name=venueId] option').allTextContents();
  out('D5 workshop rooms only', { count: opts.length - 1, hasNew: opts.some((o) => o.startsWith('Medical College - Lecture Hall A')), hasScientificOnly: opts.some((o) => o.startsWith('Hall-A (Convention Center)')) });
  out('N1-N4 fields', { organiser: await p.locator('input[name=organiser]').count(), objectives: await p.locator('textarea[name=objectives]').count(), audience: await p.locator('input[name=targetAudience]').count(), programme: await p.locator('textarea[name=prelimProgramme]').count(), mode: await p.locator('select[name=mode]').count(), director: /Workshop Director/.test(await p.locator('body').innerText()), facilitators: await p.locator('textarea[name=facilitatorNames]').count(), contribDropdown: await p.locator('details summary').count() });
  out('D1 durations', (await p.locator('select[name=duration] option').allTextContents()).filter((x) => /full days/.test(x)));
  // contributing departments drop-down
  await p.locator('details summary').click(); await p.locator('details label', { hasText: 'Cardiology' }).first().click(); await p.locator('details label', { hasText: 'Emergency' }).first().click();
  out('N4 picked', await p.locator('input[name=contributors]').inputValue());
  // multi-day with a Sunday inside is blocked
  await fillForm(p, { title: 'R21 Three day test', date: '2026-12-19', dur: -3, venue: 'Medical College - Lecture Hall A' });
  out('D1 Sunday inside 3 days', (await p.locator('#date-help').innerText()));
  // valid 3-day workshop Tue 15 - Thu 17 Dec
  await p.fill('input[name=date]', '2026-12-15'); await p.waitForTimeout(1200);
  out('D1 range shown', await p.locator('text=/Tue 15 Dec to Thu 17 Dec/').count());
  await p.locator('body').click({ position: { x: 5, y: 5 } }); out('N4 kept after closing', await p.locator('input[name=contributors]').inputValue());
  out('submit state', { disabled: await p.getByRole('button', { name: 'Submit for review' }).isDisabled().catch(() => 'missing'), msg: await p.locator('text=/already booked|is free on/').allInnerTexts(), buttons: await p.locator('button.a-btn-red').allInnerTexts() });
  await p.getByRole('button', { name: 'Submit for review' }).click(); await p.waitForURL(/\/admin\/workshops\/[^/]+\?saved=1/);
  const wsUrl = p.url().split('?')[0]; let t = await p.locator('body').innerText();
  out('saved 3-day request', { days: /3 full days/.test(t), director: /Workshop Director/.test(t), facil: /Facilitator Two/.test(t), objectives: /Educational objectives/i.test(t), organiser: /Organiser Test/.test(t), contributors: /Cardiology/.test(t) });
  // clash: 1-day on Wed 16 Dec in the same room is blocked (the 3-day workshop holds the room)
  await p.goto(B + '/admin/workshops/new');
  await fillForm(p, { title: 'R21 Clash test', date: '2026-12-16', dur: 240, venue: 'Medical College - Lecture Hall A' });
  await p.waitForTimeout(800);
  out('clash with the 3-day workshop', (await p.locator('text=/already booked/').first().innerText().catch(() => 'none')).slice(0, 90));
  await p.keyboard.press('Escape'); await p.locator('[aria-label=Close]').click().catch(() => {});
  // N2 online: no room needed
  await p.goto(B + '/admin/workshops/new');
  await fillForm(p, { title: 'R21 Online test', date: '2026-12-16', dur: 120, mode: 'ONLINE' });
  out('N2 online hides venue', { venue: await p.locator('select[name=venueId]').count(), link: await p.locator('input[name=onlineLink]').count() });
  await p.fill('input[name=onlineLink]', 'https://zoom.us/j/123');
  await p.getByRole('button', { name: 'Submit for review' }).click(); await p.waitForURL(/\?saved=1/);
  t = await p.locator('body').innerText(); out('online saved', { venue: /Venue\s*Online/.test(t), link: /zoom\.us/.test(t) });
  // D3: admin approves the 3-day one, HOD can no longer edit, committee/Super Admin can
  const adm = await as(b, 'admin@lnh.edu.pk'); const a = await adm.newPage();
  await a.goto(wsUrl); await a.locator('button[name=status][value=APPROVED]').click(); await a.waitForTimeout(1200);
  await p.goto(wsUrl + '/edit'); out('D3 HOD after decision', p.url().includes('locked=1') ? 'redirected (locked)' : 'CAN EDIT');
  await a.goto(wsUrl + '/edit'); out('D3 admin after decision', await a.locator('input[name=title]').count() ? 'can edit' : 'blocked');
  await a.fill('input[name=title]', 'R21 Three-Day Critical Care Course'); await a.getByRole('button', { name: 'Save changes' }).click(); await a.waitForURL(/\?saved=1/);
  t = await a.locator('body').innerText(); out('N1 finalised title', { proposed: /Proposed title\s*R21 Three day test/i.test(t) });
  const slug = await a.evaluate(async (u) => (await (await fetch(u)).text()).match(/\/workshops\/(ws-[a-z0-9-]+)\/flyer/)?.[1], wsUrl);
  const fl = await a.request.get(B + `/workshops/${slug}/flyer`); out('flyer PDF', { status: fl.status(), type: fl.headers()['content-type'] });
  // D5 venues admin
  await a.goto(B + '/admin/venues?use=WORKSHOP'); out('venues filter: workshop rooms', await a.locator('tbody tr').count());
  // N5 focal person: one per department
  await a.goto(B + '/admin/users');
  const nu = 'focal' + Date.now() + '@lnh.edu.pk';
  const row = a.locator('tr', { has: a.locator('input[placeholder="New user…"]') });
  await row.locator('input[name=name]').fill('Focal Anesthesia'); await row.locator('input[name=email]').fill(nu); await row.locator('select[name=role]').selectOption('FOCAL_PERSON');
  await row.locator('input[name=department]').fill('Anesthesia'); await row.locator('input[name=password]').fill(PW); await row.getByRole('button', { name: 'Add' }).click(); await a.waitForTimeout(1500);
  const row2 = a.locator('tr', { has: a.locator('input[placeholder="New user…"]') });
  await row2.locator('input[name=name]').fill('Second Focal'); await row2.locator('input[name=email]').fill('x' + nu); await row2.locator('select[name=role]').selectOption('FOCAL_PERSON');
  await row2.locator('input[name=department]').fill('Anesthesia'); await row2.locator('input[name=password]').fill(PW); await row2.getByRole('button', { name: 'Add' }).click(); await a.waitForTimeout(1500);
  out('N5 second focal person refused', /already has a focal person/.test(await a.locator('body').innerText()));
  const fo = await as(b, nu); const f = await fo.newPage();
  await f.goto(B + '/admin'); out('focal lands on', f.url().replace(B, ''));
  const navText = await f.locator('aside').innerText().catch(() => ''); out('focal menu', navText.split('\n').filter((x) => x.trim()).slice(0, 6));
  // N7 feedback before verification (participant 1)
  const pub = await b.newContext(); const pp = await pub.newPage();
  await pp.goto(B + `/feedback/${P.w.slug}`);
  await pp.fill('#wf-reg', P.ppl[0].reg_no); await pp.fill('#wf-email', P.ppl[0].email); await pp.getByRole('button', { name: 'Continue' }).click();
  await pp.waitForSelector('#wf-ws'); out('N7 dropdown', await pp.locator('#wf-ws option').allTextContents());
  out('N7 statements', await pp.locator('[role=radiogroup]').count());
  for (let i = 0; i < 12; i++) await pp.locator('[role=radiogroup]').nth(i).locator('[role=radio]').nth(i === 8 || i === 9 ? 1 : 4).click();
  await pp.getByRole('button', { name: 'Excellent' }).click(); await pp.getByRole('button', { name: 'Maybe' }).click(); await pp.locator('button', { hasText: /^Yes$/ }).last().click();
  await pp.fill('#comments', 'Great hands-on stations'); await pp.getByRole('button', { name: 'Submit feedback' }).click();
  await pp.waitForSelector('text=Thank you!'); out('N7 submitted (not yet verified)', (await pp.locator('body').innerText()).match(/Your (feedback|workshop)[^.]*\./)?.[0]);
  const dup = await api(pub, '/api/feedback/workshops', { regNo: P.ppl[0].reg_no, email: P.ppl[0].email, slug: P.w.slug, answers: Array(12).fill(4), overall: 4, recommend: 'YES', contact: false });
  out('N7 duplicate refused', dup);
  // N5 focal person confirms attendance: participant 1 (feedback in -> certificate), participant 2 (no feedback -> feedback request)
  await f.goto(B + '/admin/attendance'); await f.locator('a', { hasText: P.w.title }).click();
  for (const x of P.ppl) { const cb = f.locator(`input[name=present][value="${x.item}"]`); if (!(await cb.isChecked())) await cb.check(); }
  await f.getByRole('button', { name: 'Confirm attendance' }).click(); await f.waitForURL(/saved=/);
  out('N5 saved', (await f.locator('text=/Saved\\./').innerText()));
  t = await f.locator('table').innerText(); out('N6 rows', t.split('\n').filter((l) => /LNH27-W|Waiting for feedback/.test(l)).map((l) => l.replace(/\s+/g, ' ').slice(-40)));
  const c1 = await pub.request.get(B + `/api/certificates/workshop/${P.ppl[0].item}?t=${P.ppl[0].t}`); out('N6 certificate 1', { status: c1.status(), type: c1.headers()['content-type'] });
  const c2 = await pub.request.get(B + `/api/certificates/workshop/${P.ppl[1].item}?t=${P.ppl[1].t}`); out('N6 certificate 2 before feedback', c2.status());
  const fb2 = await api(pub, '/api/feedback/workshops', { token: P.ppl[1].t, slug: P.w.slug, answers: Array(12).fill(5), overall: 5, recommend: 'YES', contact: true });
  out('N6 feedback 2 -> certificate', fb2.j);
  const wrong = await pub.request.get(B + `/api/certificates/workshop/${P.ppl[1].item}?t=wrong`); out('certificate wrong token', wrong.status());
  // success page shows the certificate link
  await pp.goto(B + `/register/success/${P.ppl[0].t}`); out('success page certificate link', await pp.locator('a', { hasText: 'Workshop certificate' }).count());
  // D6 agenda
  await pp.goto(B + '/agenda'); await pp.locator('button', { hasText: 'Add to my itinerary' }).nth(1).dispatchEvent('click'); await pp.waitForTimeout(300);
  await pp.getByRole('button', { name: /My itinerary \(1\)/ }).dispatchEvent('click'); await pp.waitForTimeout(300);
  out('D6 itinerary filter', await pp.locator('.itin-item:visible').count());
  const csv = await pub.request.get(B + '/api/agenda/csv?type=workshop'); out('D6 CSV', { status: csv.status(), first: (await csv.text()).split('\n')[0].replace('﻿', '') });
  const reg = await pub.request.get(B + '/register'); out('D4 kiosk text', /kiosk registration/.test(await reg.text()));
  // admin live feedback shows the 12 statements
  await a.goto(B + `/admin/sessions/${P.w.id}`); out('admin feedback statements', /Workshop feedback form · 2 responses/i.test(await a.locator('body').innerText()));
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
