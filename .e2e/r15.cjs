// 15 Nov 2026: Users & roles (department roles, safety rules, change log), Departments (rename, merge, add), access read fresh.
const { chromium } = require('playwright');
const B = 'http://localhost:3000', PW = 'ChangeMe!2026', NEWPW = 'Multi-Dept-2027!';
const out = (k, v) => console.log(k.padEnd(48), typeof v === 'string' ? v : JSON.stringify(v));
const T = Date.now() % 100000, MULTI = `multi${T}@lnh.edu.pk`, SA2 = `sa2-${T}@lnh.edu.pk`;
async function login(b, email, pw = PW) { const ctx = await b.newContext(); const r = await ctx.request.post(B + '/api/admin/login', { data: { email, password: pw } }); return r.status() === 200 ? ctx : null; }
const alert = async (p) => (await p.locator('p[role=alert]').count()) ? (await p.locator('p[role=alert]').innerText()).slice(0, 110) : 'saved=' + p.url().includes('saved=1');
(async () => {
  const b = await chromium.launch();
  const sa = await (await login(b, 'admin@lnh.edu.pk')).newPage();
  await sa.goto(B + '/admin/users?dept=Anesthesia'); out('filter by department Anesthesia', (await sa.locator('tbody tr').allInnerTexts()).map((t) => t.split('\n')[0]));
  // new multi-department login
  const fill = async (email, pw) => {
    await sa.goto(B + '/admin/users?u=new'); await sa.fill('input[name=name]', 'Dr. Multi Department'); await sa.fill('input[name=email]', email); await sa.selectOption('aside select[name=role]', 'DEPARTMENT');
    await sa.selectOption('select[name=new_dept_0]', 'Cardiology'); await sa.selectOption('select[name=new_role_0]', 'HEAD');
    await sa.selectOption('select[name=new_dept_1]', 'Nursing'); await sa.selectOption('select[name=new_role_1]', 'COORDINATOR');
    await sa.fill('input[name=password]', pw); await sa.evaluate(() => document.querySelector('input[name=password]').removeAttribute('minlength'));
    await sa.getByRole('button', { name: 'Create login' }).click(); await sa.waitForURL(/saved=1|err=/);
  };
  await fill(MULTI, 'short1!'); out('short password', await alert(sa));
  await fill('hod.cardiology@lnh.edu.pk', NEWPW); out('duplicate email', await alert(sa));
  await fill(MULTI, NEWPW); out('created', await alert(sa));
  out('its departments in the list', (await sa.locator('tbody tr', { hasText: MULTI }).innerText()).replace(/\s+/g, ' ').slice(0, 140));
  out('change log', (await sa.locator('text=Change log').locator('..').innerText()).replace(/\s+/g, ' ').slice(0, 160));
  const multiId = new URL(sa.url()).searchParams.get('u');
  // the new person: switcher, scoped pages
  const mctx = await login(b, MULTI, NEWPW); const m = await mctx.newPage();
  await m.goto(B + '/admin'); out('multi lands on', new URL(m.url()).pathname);
  out('switcher options', await m.locator('select[name=dept] option').allInnerTexts());
  await m.goto(B + '/admin/dept/abstracts'); out('abstract review (Head only in Cardiology)', (await m.locator('h1').innerText()));
  await m.goto(B + '/admin/dept/sessions'); out('sessions before switch', await m.locator('h1').innerText());
  await m.selectOption('select[name=dept]', 'Nursing'); await m.getByRole('button', { name: 'Switch' }).click(); await m.waitForLoadState('networkidle');
  out('sessions after switch', await m.locator('h1').innerText());
  await m.goto(B + '/admin/workshops/new'); out('workshop owning dept choices', (await m.locator('select[name=department] option').allInnerTexts()).filter((x) => !x.includes('Choose')));
  await m.goto(B + '/admin/users'); out('multi opening Users & roles', new URL(m.url()).pathname + new URL(m.url()).search);
  // R1: remove Cardiology -> abstract review gone at once
  await sa.goto(B + `/admin/users?u=${multiId}`); await sa.selectOption('select[name="dr_Cardiology"]', 'REMOVE'); await sa.getByRole('button', { name: 'Save', exact: true }).click(); await sa.waitForURL(/saved=|err=/); await sa.waitForLoadState('networkidle');
  await m.goto(B + '/admin/dept/abstracts'); out('after removing Cardiology: abstracts page', new URL(m.url()).pathname + new URL(m.url()).search);
  // password reset ends the other person's sign-in
  await sa.goto(B + `/admin/users?u=${multiId}`); await sa.fill('input[name=password]', NEWPW + 'x'); await sa.getByRole('button', { name: 'Save', exact: true }).click(); await sa.waitForURL(/saved=|err=/); await sa.waitForLoadState('networkidle');
  await m.goto(B + '/admin/dept'); out('after password reset, multi is at', new URL(m.url()).pathname);
  // safety: own role and status locked in the form; last Super Admin rule
  await sa.goto(B + '/admin/users?q=admin@lnh.edu.pk'); await sa.getByRole('link', { name: 'Edit' }).first().click(); await sa.waitForLoadState('networkidle');
  out('own role select disabled', await sa.locator('aside select[name=role]').isDisabled());
  await sa.goto(B + '/admin/users?u=new'); await sa.fill('input[name=name]', 'Second Super Admin'); await sa.fill('input[name=email]', SA2); await sa.selectOption('aside select[name=role]', 'SUPER_ADMIN'); await sa.fill('input[name=password]', NEWPW);
  await sa.getByRole('button', { name: 'Create login' }).click(); await sa.waitForURL(/saved=1|err=/);
  const sa2id = new URL(sa.url()).searchParams.get('u');
  const s2 = await (await login(b, SA2, NEWPW)).newPage();
  await s2.goto(B + `/admin/users?u=${sa2id}`); out('SA2: own active box disabled', await s2.locator('aside input[name=active][type=checkbox]').isDisabled());
  // deactivate SA2 from admin (another SA exists) -> SA2 out at once
  await sa.goto(B + `/admin/users?u=${sa2id}`); await sa.uncheck('aside input[name=active]'); await sa.getByRole('button', { name: 'Save', exact: true }).click(); await sa.waitForURL(/saved=|err=/); await sa.waitForLoadState('networkidle');
  await s2.goto(B + '/admin/users'); out('deactivated SA2 is at', new URL(s2.url()).pathname);
  // Departments: add duplicate, rename review entry, merge
  await sa.goto(B + '/admin/departments'); out('needs-review banner', ((await sa.locator('text=came from records').count()) ? 'shown' : 'none'));
  await sa.fill('input[placeholder^="New department"]', '  cardiology '); await sa.getByRole('button', { name: 'Add department' }).click(); await sa.waitForLoadState('networkidle'); out('add "cardiology"', await alert(sa));
  const editOf = async (name) => { await sa.goto(B + '/admin/departments?show=all&q=' + encodeURIComponent(name)); await sa.locator('tbody tr', { hasText: name }).first().getByRole('link', { name: 'Edit' }).click(); await sa.waitForLoadState('networkidle'); };
  await editOf('Health Economics'); await sa.fill('form:has(button:text("Save")) input[name=name]', 'Health Economics & Policy'); await sa.fill('input[name=code]', 'HEP'); await sa.check('input[name=active]');
  await sa.getByRole('button', { name: 'Save', exact: true }).click(); await sa.waitForURL(/saved=|err=/); await sa.waitForLoadState('networkidle'); out('rename review entry', await alert(sa));
  await editOf('Research & Biostatistics'); await sa.selectOption('select[name=into]', 'Community Medicine'); await sa.getByRole('button', { name: 'Merge' }).click(); await sa.waitForLoadState('networkidle'); out('merge without tick', await alert(sa));
  await sa.selectOption('select[name=into]', 'Community Medicine'); await sa.check('input[name=confirm]'); await sa.getByRole('button', { name: 'Merge' }).click(); await sa.waitForLoadState('networkidle');
  out('merge', (await sa.locator('text=/Merged|Saved/').first().innerText()).slice(0, 60) + ' · now editing ' + await sa.locator('aside h2').first().innerText());
  await sa.goto(B + '/admin/departments?show=all&q=Research'); out('merged department gone', await sa.locator('tbody tr').count());
  // old HOD login still works with the department portal
  const h = await (await login(b, 'hod.anesthesia@lnh.edu.pk')).newPage(); await h.goto(B + '/admin/dept'); out('HOD Anesthesia portal', await h.locator('h1').innerText());
  await sa.screenshot({ path: '/tmp/claude-0/departments.png', fullPage: true });
  await sa.goto(B + `/admin/users?u=${multiId}`); await sa.screenshot({ path: '/tmp/claude-0/users.png', fullPage: true });
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
