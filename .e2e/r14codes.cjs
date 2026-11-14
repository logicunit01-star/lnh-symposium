// Sign-in codes with only an Admin → Email settings mailbox (no SMTP_* in the server file): sign up, "Email and text me a code instead", "Forgot password?".
const { chromium } = require('playwright'); const fs = require('fs');
const B = 'http://localhost:3000'; const MAILS = process.argv[2]; const EMAIL = `codes${Date.now() % 100000}@example.com`;
const out = (k, v) => console.log(k.padEnd(40), typeof v === 'string' ? v : JSON.stringify(v));
const codeFor = async (to) => { for (let i = 0; i < 20; i++) { const m = fs.readFileSync(MAILS, 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((x) => x.to.includes(to)).at(-1); const c = m && (m.data.replace(/=\r?\n/g, '').match(/>\s*(\d{6})\s*</) || m.data.match(/\b(\d{6})\b/)); if (c && !seen.has(m.data)) { seen.add(m.data); return c[1]; } await new Promise((r) => setTimeout(r, 500)); } return null; };
const seen = new Set();
const typeCode = async (p, c) => { await p.getByLabel('Digit 1').click(); await p.keyboard.type(c); };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  await p.goto(B + '/account'); await p.fill('#email', EMAIL); await p.getByRole('button', { name: 'Continue' }).click();
  await p.fill('#firstName', 'Code'); await p.fill('#lastName', 'Tester'); await p.fill('#phone', '03001234567'); await p.fill('#password', 'Str0ng!Pass');
  await p.getByRole('button', { name: 'Create account' }).click(); await p.getByLabel('Digit 1').waitFor();
  out('sign-up: code shown on screen?', await p.locator('text=/demo code|Your code is/i').count() > 0);
  let c = await codeFor(EMAIL); out('sign-up code emailed', !!c); await typeCode(p, c); await p.waitForURL((u) => !u.pathname.endsWith('/account') || u.search.includes('welcome'), { timeout: 15000 }).catch(() => {});
  out('signed up, now at', new URL(p.url()).pathname);
  const q = await (await b.newContext()).newPage();
  await q.goto(B + '/account'); await q.fill('#email', EMAIL); await q.getByRole('button', { name: 'Continue' }).click(); await q.locator('#pw').waitFor();
  await q.getByRole('button', { name: 'Email and text me a code instead' }).click(); await q.getByLabel('Digit 1').waitFor({ timeout: 15000 });
  c = await codeFor(EMAIL); out('code sign-in: code emailed', !!c); await typeCode(q, c); await q.waitForURL((u) => !u.pathname.endsWith('/account'), { timeout: 15000 }).catch(() => {});
  out('code sign-in, now at', new URL(q.url()).pathname);
  const r = await (await b.newContext()).newPage();
  await r.goto(B + '/account'); await r.fill('#email', EMAIL); await r.getByRole('button', { name: 'Continue' }).click(); await r.locator('#pw').waitFor();
  await r.getByRole('button', { name: 'Forgot password?' }).click(); await r.locator('#rcode').waitFor({ timeout: 15000 });
  c = await codeFor(EMAIL); out('forgot password: code emailed', !!c); await r.fill('#rcode', c); await r.fill('#npw', 'N3w!Password'); await r.getByRole('button', { name: /Save password/ }).click();
  await r.waitForURL((u) => !u.pathname.endsWith('/account'), { timeout: 15000 }).catch(() => {}); out('reset, now at', new URL(r.url()).pathname);
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
