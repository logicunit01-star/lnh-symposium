// Crawl every admin page reachable by links, per role: HTTP status, server/client errors, horizontal overflow (1280 and 390 px).
const { chromium } = require('playwright');
const B = 'http://localhost:3000', PW = 'ChangeMe!2026';
const ROLES = (process.argv[2] || 'admin@lnh.edu.pk').split(',');
(async () => {
  const b = await chromium.launch();
  for (const email of ROLES) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
    const r = await ctx.request.post(B + '/api/admin/login', { data: { email, password: PW } });
    if (r.status() !== 200) { console.log('LOGIN FAILED', email, r.status()); continue; }
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push('pageerror: ' + e.message.slice(0, 120)));
    p.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource.*404/.test(m.text())) errs.push('console: ' + m.text().slice(0, 140)); });
    const seen = new Set(), queue = ['/admin'], issues = [];
    while (queue.length && seen.size < 140) {
      const u = queue.shift(); if (seen.has(u)) continue; seen.add(u); errs.length = 0;
      let st = 0; try { const res = await p.goto(B + u, { waitUntil: 'networkidle', timeout: 30000 }); st = res?.status() ?? 0; } catch (e) { issues.push(`${u} :: NAV ${e.message.slice(0, 60)}`); continue; }
      const body = await p.locator('body').innerText().catch(() => '');
      if (st >= 400 || /Application error|Unhandled Runtime Error|Internal Server Error/.test(body)) issues.push(`${u} :: HTTP ${st} ${body.slice(0, 80).replace(/\s+/g, ' ')}`);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 2) issues.push(`${u} :: overflow ${over}px @1280`);
      if (errs.length) issues.push(`${u} :: ${[...new Set(errs)].join(' | ')}`);
      const links = await p.$$eval('a[href^="/admin"]', (as) => as.map((a) => a.getAttribute('href')));
      for (const l of links) { const clean = l.split('#')[0]; if (!seen.has(clean) && !/logout|\/api\//.test(clean) && seen.size + queue.length < 400) queue.push(clean); }
    }
    // phone width pass on the main pages
    await p.setViewportSize({ width: 390, height: 844 });
    for (const u of [...seen].filter((x) => !x.includes('?')).slice(0, 60)) {
      try { await p.goto(B + u, { waitUntil: 'networkidle', timeout: 30000 }); } catch { continue; }
      const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 2) issues.push(`${u} :: overflow ${over}px @390`);
    }
    console.log(`\n=== ${email}: ${seen.size} pages, ${issues.length} issues`); issues.forEach((i) => console.log('  ' + i));
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
