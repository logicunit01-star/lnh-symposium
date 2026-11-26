// Email settings + per-notification templates and senders (14 Nov 2026). Needs .e2e/smtp-sink.py on 127.0.0.1:2525 writing to argv[2].
const { chromium } = require('playwright');
const fs = require('fs');
const B = 'http://localhost:3000', PW = 'ChangeMe!2026';
const [MAILFILE, TOKEN] = process.argv.slice(2);
const out = (k, v) => console.log(k.padEnd(50), typeof v === 'string' ? v : JSON.stringify(v));
const mails = () => (fs.existsSync(MAILFILE) ? fs.readFileSync(MAILFILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const hdr = (m, h) => (m.data.match(new RegExp(`^${h}: (.*(?:\\r?\\n[ \\t].*)*)`, 'mi')) || [])[1]?.replace(/\r?\n[ \t]+/g, ' ').trim();
const subj = (m) => { const v = hdr(m, 'Subject') || ''; return v.replace(/=\?utf-8\?Q\?(.*?)\?=/gi, (_, q) => q.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (__, h) => String.fromCharCode(parseInt(h, 16)))).replace(/\s+/g, ' '); };
async function as(b, email) { const ctx = await b.newContext(); const r = await ctx.request.post(B + '/api/admin/login', { data: { email, password: PW } }); if (r.status() !== 200) throw new Error('login ' + email); return ctx; }
(async () => {
  const b = await chromium.launch();
  // roles
  const sec = await as(b, 'secretariat@lnh.edu.pk'); const sp = await sec.newPage();
  await sp.goto(B + '/admin/email-settings'); out('secretariat: email settings blocked', sp.url().includes('denied=1'));
  await sp.goto(B + '/admin/emails?t=REGISTRATION_CONFIRMED'); out('secretariat: templates yes, sender read-only', { open: await sp.locator('h2', { hasText: 'Registration confirmed' }).count(), mailboxDisabled: await sp.locator('select[name=accountId]').isDisabled() });
  const sa = await as(b, 'admin@lnh.edu.pk'); const p = await sa.newPage();
  const fresh = (q = '') => p.goto(B + '/admin/email-settings' + q);
  // add mailbox with a wrong password -> test fails
  await fresh('?a=new');
  await p.fill('input[name=label]', 'Registration'); await p.fill('input[name=host]', '127.0.0.1'); await p.fill('input[name=port]', '2525');
  await p.selectOption('select[name=security]', 'NONE'); await p.fill('input[name=username]', 'test@example.test'); await p.fill('input[name=password]', 'wrong-password');
  await p.fill('input[name=fromName]', '9th LNH Symposium'); await p.fill('input[name=fromAddress]', 'registration@symposium2027.lnh.edu.pk');
  await p.getByRole('button', { name: 'Save mailbox' }).click(); await p.waitForURL(/saved=account/);
  const acctUrl = p.url();
  out('mailbox saved; password not in page', { hidden: !(await p.content()).includes('wrong-password'), default: await p.locator('text=Default').count() > 0 });
  await p.getByRole('button', { name: 'Send test email' }).click(); await p.waitForURL(/test=/, { timeout: 60000 });
  out('test with wrong password', (await p.locator('text=/Could not send|Sent to/').innerText()).slice(0, 90));
  // correct password, blank fields keep the rest
  await p.goto(acctUrl); await p.fill('input[name=password]', 'mail-pass-123'); await p.getByRole('button', { name: 'Save mailbox' }).click(); await p.waitForURL(/saved=account/);
  await p.getByRole('button', { name: 'Send test email' }).click(); await p.waitForURL(/test=/, { timeout: 60000 });
  out('test with right password', (await p.locator('text=/Could not send|Sent to/').innerText()).slice(0, 60));
  let m = mails().at(-1); out('test email received', { from: hdr(m, 'From'), to: m.to });
  // second mailbox for the Scientific Committee
  await fresh('?a=new');
  await p.fill('input[name=label]', 'Scientific Committee'); await p.fill('input[name=host]', '127.0.0.1'); await p.fill('input[name=port]', '2525');
  await p.selectOption('select[name=security]', 'NONE'); await p.fill('input[name=username]', 'test@example.test'); await p.fill('input[name=password]', 'mail-pass-123');
  await p.fill('input[name=fromName]', 'Scientific Committee'); await p.fill('input[name=fromAddress]', 'scientific@symposium2027.lnh.edu.pk'); await p.fill('input[name=replyTo]', 'sc-replies@lnh.edu.pk');
  await p.getByRole('button', { name: 'Save mailbox' }).click(); await p.waitForURL(/saved=account/);
  // assign it to "Abstract received" with sender name + CC, then send a sample
  await p.goto(B + '/admin/emails?t=ABSTRACT_RECEIVED');
  await p.selectOption('select[name=accountId]', { label: 'Scientific Committee (scientific@symposium2027.lnh.edu.pk)' });
  await p.fill('input[name=fromName]', 'Scientific Committee, 9th LNH Symposium'); await p.fill('input[name=cc]', 'sc-office@lnh.edu.pk');
  await p.getByRole('button', { name: 'Save', exact: true }).click(); await p.waitForURL(/saved=1/);
  await p.getByRole('button', { name: 'Send a sample to me' }).click(); await p.waitForURL(/tested=/);
  m = mails().at(-1); out('per-notification sender', { from: hdr(m, 'From'), replyTo: hdr(m, 'Reply-To'), subject: subj(m).slice(0, 70) });
  // default mailbox used by another notification (one-time code sample)
  await p.goto(B + '/admin/emails?t=SIGN_IN_CODE'); out('locked template has no off switch', { off: await p.locator('input[name=enabled]').count(), note: await p.locator('text=Always sent').count() });
  await p.getByRole('button', { name: 'Send a sample to me' }).click(); await p.waitForURL(/tested=/);
  m = mails().at(-1); out('default mailbox for others', { from: hdr(m, 'From'), subject: subj(m) });
  // a real notification: website enquiry -> reply-to is the person who wrote
  const pub = await b.newContext();
  await pub.request.post(B + '/api/contact', { data: { name: 'Dr. Test Person', email: 'person@example.com', subject: 'Parking question', message: 'Is parking available for participants?' } });
  await new Promise((r) => setTimeout(r, 800)); m = mails().at(-1);
  out('enquiry email', { to: m.to, replyTo: hdr(m, 'Reply-To'), subject: subj(m) });
  // registration confirmed (mock payment) with the PDF attached
  if (TOKEN) {
    const c = await (await pub.request.post(`${B}/api/pay/${TOKEN}`)).json(); const txn = new URL(c.url).searchParams.get('txn');
    await pub.request.post(B + '/api/payments/mock', { form: { txn, result: 'approve' }, maxRedirects: 0 });
    await new Promise((r) => setTimeout(r, 2500)); m = mails().at(-1);
    out('registration confirmed email', { subject: subj(m), pdf: /Content-Type: application\/pdf/i.test(m.data), details: /Registration No\./.test(m.data) && /CONFIRMED/.test(m.data) });
  }
  // test mode: everything to one address
  await fresh(); await p.check('input[name=mode][value=TEST]'); await p.fill('input[name=testAddress]', 'qa@lnh.edu.pk'); await p.getByRole('button', { name: 'Save delivery' }).click(); await p.waitForURL(/saved=mode/);
  await new Promise((r) => setTimeout(r, 31000)); // settings cache (30 s)
  await pub.request.post(B + '/api/contact', { data: { name: 'Dr. Test Two', email: 'two@example.com', subject: 'Test mode check', message: 'This should go to the test address only.' } });
  await new Promise((r) => setTimeout(r, 800)); m = mails().at(-1); out('test mode', { to: m.to, subject: subj(m).slice(0, 70) });
  // log only
  await fresh(); await p.check('input[name=mode][value=LOG]'); await p.getByRole('button', { name: 'Save delivery' }).click(); await p.waitForURL(/saved=mode/);
  const before = mails().length; await new Promise((r) => setTimeout(r, 31000));
  await pub.request.post(B + '/api/contact', { data: { name: 'Dr. Test Three', email: 'three@example.com', subject: 'Log only check', message: 'This should only be recorded, not sent.' } });
  await new Promise((r) => setTimeout(r, 800)); out('log only: nothing sent', mails().length === before);
  await p.goto(B + '/admin/emails?tab=log&q=Log%20only'); out('…but recorded in Sent emails', (await p.locator('tbody tr').first().innerText()).replace(/\s+/g, ' ').slice(0, 90));
  await fresh(); await p.check('input[name=mode][value=SEND]'); await p.getByRole('button', { name: 'Save delivery' }).click(); await p.waitForURL(/saved=mode/);
  await b.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
