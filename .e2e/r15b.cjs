// 15 Nov 2026: pages still open for each kind of login after the department-role change.
const { chromium } = require('playwright'); const B = 'http://localhost:3000';
const out = (k, v) => console.log(k.padEnd(52), typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
  const b = await chromium.launch();
  const as = async (email) => { const ctx = await b.newContext(); await ctx.request.post(B + '/api/admin/login', { data: { email, password: 'ChangeMe!2026' } }); return ctx.newPage(); };
  const visit = async (p, path) => { const r = await p.goto(B + path); const h = await p.locator('h1').first().innerText().catch(() => '-'); return `${r.status()} ${new URL(p.url()).pathname}${new URL(p.url()).search} · ${h.slice(0, 50)}`; };
  const hod = await as('hod.cardiology@lnh.edu.pk');
  for (const x of ['/admin/dept', '/admin/dept/abstracts', '/admin/dept/sessions', '/admin/dept/guests', '/admin/workshops', '/admin/workshops/new', '/admin/registrations']) out('HOD Cardiology ' + x, await visit(hod, x));
  out('HOD workshops listed (departments)', [...new Set((await (await hod.goto(B + '/admin/workshops'), hod.locator('tbody tr td:nth-child(3)')).allInnerTexts()).map((t) => t.trim()))].slice(0, 5));
  const sec = await as('secretariat@lnh.edu.pk');
  for (const x of ['/admin/workshops', '/admin/attendance', '/admin/departments', '/admin/users', '/admin/programme/new']) out('Secretariat ' + x, await visit(sec, x));
  const sc = await as('sc.chair@lnh.edu.pk');
  for (const x of ['/admin/programme/new', '/admin/abstracts', '/admin/departments']) out('SC Chair ' + x, await visit(sc, x));
  const pub = await (await b.newContext()).newPage();
  await pub.goto(B + '/abstracts'); out('public abstract form department options', await pub.locator('select#specialty option').count().catch(() => 'n/a'));
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
