// "description changes recommendation 14.11.2026": wording, footer, register page, guest/volunteer invitation links
const { chromium } = require('playwright');
const B = 'http://localhost:3000';
const out = (k, v) => console.log(k.padEnd(46), typeof v === 'string' ? v : JSON.stringify(v));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage();
  const a = await b.newContext(); await a.request.post(B + '/api/admin/login', { data: { email: 'admin@lnh.edu.pk', password: 'ChangeMe!2026' } });
  const sp = await a.newPage(); await sp.goto(B + '/admin/settings'); const code = await sp.locator('input[name=guestCode]').inputValue();
  out('guest code set', /^[A-Za-z0-9]{8,}$/.test(code));
  await p.goto(B + '/register/guest'); out('guest form without code', { inviteOnly: await p.locator('text=Invitation only').count(), form: await p.locator('form').count() });
  await p.goto(B + '/register/volunteer?code=wrong'); out('volunteer form wrong code', (await p.locator('text=Invitation only').count()) > 0);
  await p.goto(B + `/register/guest?code=${code}`); out('guest form with code', { form: (await p.locator('input').count()) > 5 });
  const api = await ctx.request.post(B + '/api/register/guest', { data: { regType: 'VOLUNTEER' } }); out('API without code', api.status());
  await p.goto(B + '/'); const foot = await p.locator('footer').innerText();
  out('footer', { noLogoTagline: !/Shaping the New Era of Healthcare: Convergence/.test(foot), cols: /PARTICIPATE[\s\S]*INFORMATION/i.test(foot), noGuest: !/Guest registration|Volunteer registration/.test(foot), privacy: await p.locator('footer a', { hasText: 'Privacy Policy' }).getAttribute('href'), noOrganized: !/Organized by/.test(foot), email: /symposium2027@lnh\.edu\.pk/.test(foot), follow: /Follow Liaquat National Hospital/i.test(foot) });
  out('home abstracts text', (await p.locator('text=Abstracts are invited!').count()) > 0);
  await p.goto(B + '/register'); const t = await p.locator('main').innerText().catch(async () => await p.locator('body').innerText());
  out('register page', { heading: /REGISTER FOR THE\s*EVENT/i.test(t), early: (t.match(/Early-bird registration charges are applicable until [^.]+/) || [''])[0], lnh: /LNH employees can also register online/.test(t), noCards: !(await p.locator('button', { hasText: 'Add ticket' }).count()), explore: await p.locator('a', { hasText: 'Explore Workshops' }).count(), registerNow: await p.locator('a', { hasText: 'Register Now' }).count(), noGuestLink: !/Invited guest or volunteer/.test(t), noPassWord: !/Symposium Pass/.test(t) });
  await p.goto(B + '/venues'); out('venue tabs', await p.locator('button', { hasText: /^\d · / }).allInnerTexts());
  await p.goto(B + '/contact'); const c = await p.locator('body').innerText(); out('contact', { heading: /HAVE ANY QUERY\?/i.test(c), intro: /Please contact the symposium secretariat/.test(c), email: /symposium2027@lnh\.edu\.pk/.test(c) });
  await p.goto(B + '/abstracts'); const ab = await p.locator('body').innerText(); out('abstracts sign-in box', { intro: /reviewed by the relevant specialty\/department/.test(ab), btn: await p.locator('a', { hasText: 'Create an account' }).count() });
  await p.goto(B + '/my-registrations'); out('find my registration', /Retrieve your registration details/.test(await p.locator('body').innerText()));
  await p.goto(B + '/account'); out('sign in intro', /One-time registration for the 3-day Symposium/.test(await p.locator('body').innerText()));
  // whole site: no "Symposium Pass" / "ticket" wording left in the public pages
  const left = [];
  for (const u of ['/', '/register', '/workshops', '/agenda', '/sessions', '/checkout', '/account', '/my-registrations', '/programme/scientific']) { await p.goto(B + u); const tx = await p.locator('body').innerText(); const m = tx.match(/.{0,30}(Symposium Pass|[Ww]orkshop tickets?|Choose your pass|Browse workshops|My tickets).{0,30}/g); if (m) left.push(u + ': ' + m.slice(0, 2).join(' | ')); }
  out('old wording left', left.length ? left : 'none');
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
