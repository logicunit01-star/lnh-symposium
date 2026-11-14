// Homepage changes 11.11.2026
const { chromium } = require('playwright');
const B = 'http://localhost:3000';
const out = (k, v) => console.log(k.padEnd(48), typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto(B + '/'); let t = await p.locator('body').innerText();
  out('default theme', await p.evaluate(() => document.documentElement.dataset.theme));
  out('header logo + Register', { logo: await p.locator('header img[src="/brand/lnh-logo-2027.png"]').count(), register: await p.locator('header a', { hasText: /^Register$/ }).count(), noGetPass: !/Get your pass/.test(t) });
  out('hero', { title9th: /9th LNH Symposium/i.test(t), noEdition: !/9th Edition/i.test(t), noCaption: !/Stadium Road, Karachi/i.test(t.split('Organized')[0].split('Liaquat National Hospital, Stadium')[0]), noAgendaBtn: !(await p.locator('main a', { hasText: /^View Agenda$/ }).count()), noSpeakersBtn: !(await p.locator('main a', { hasText: /^Explore Speakers$/ }).count()) });
  out('ticker', /Registrations are open/i.test(t) && /Avail early bird discount/i.test(t));
  out('removed: timeline, stats, key dates, workshop cards', { timeline: !/The road to the symposium/i.test(t), stats: !/Symposium days/i.test(t), keyDates: !/Key dates/i.test(t), wsCards: !(await p.locator('main').getByRole('button', { name: 'Add ticket' }).count()) });
  out('buttons', { ws: /Workshops details and Registration/i.test(t), agenda: /View full agenda/i.test(t) });
  out('speakers section hidden', !/Voices of the/i.test(t));
  out('gallery', await p.locator('a[href="https://www.lnh.edu.pk/gallery/symposium-2025-gallery"]').count());
  const menu = await p.locator('header a').evaluateAll((a) => a.map((x) => x.textContent.trim()));
  out('menu', { venueMap: menu.includes('Venue Map') || menu.some((m) => m.startsWith('Venue Map')), noPlenary: !menu.some((m) => m.startsWith('Plenary Session')), combined: menu.some((m) => m.startsWith('Meet the Experts & Speakers')) });
  await p.goto(B + '/speakers'); out('/speakers before live', /Coming soon/.test(await p.locator('main').innerText()));
  await p.goto(B + '/programme/meet-the-experts'); out('meet-the-experts redirect', p.url().replace(B, ''));
  // admin turns speakers + agenda live
  const a = await (await b.newContext()).newPage(); await a.request.post(B + '/api/admin/login', { data: { email: 'admin@lnh.edu.pk', password: 'ChangeMe!2026' } });
  await a.goto(B + '/admin/settings'); await a.locator('input[name=speakersLive]').check(); await a.locator('input[name=agendaLive]').check();
  await a.getByRole('button', { name: 'Save settings' }).click(); await a.waitForTimeout(1500);
  await p.goto(B + '/'); t = await p.locator('body').innerText();
  out('after going live', { agendaBtn: await p.locator('main a', { hasText: /^View Agenda$/ }).count(), speakersBtn: await p.locator('main a', { hasText: /^Explore Speakers$/ }).count(), section: /Voices of the/i.test(t) });
  await a.goto(B + '/admin/settings'); await a.locator('input[name=speakersLive]').uncheck(); await a.locator('input[name=agendaLive]').uncheck();
  await a.getByRole('button', { name: 'Save settings' }).click(); await a.waitForTimeout(1500);
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })); await d.addInitScript(() => localStorage.setItem('lnh-theme', 'dark'));
  const dp = await d.newPage(); await dp.goto(B + '/');
  out('night mode logo', await dp.locator('header img:visible').first().getAttribute('src'));
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
