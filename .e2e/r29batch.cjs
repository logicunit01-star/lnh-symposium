const { chromium } = require('playwright'); const B='http://127.0.0.1:3100';
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1366,height:900}});
 const p=await c.newPage(); const out=(k,v)=>console.log(k,'|',v);
 await p.goto(B+'/'); await p.waitForTimeout(1500); out('home chip', await p.locator('text=Liaquat National Hospital, Karachi').count()); out('countdown', await p.locator('text=/Countdown to Day 1/').count()); await p.screenshot({path:'/tmp/fl/b-home.png'});
 out('favicon', (await c.request.get(B+'/icon.png')).status() + ' ' + (await c.request.get(B+'/favicon.ico')).status());
 await p.goto(B+'/venues'); out('venues all rooms', await p.locator('text=All rooms').count());
 await p.goto(B+'/register'); await p.waitForTimeout(800); out('tier fee shown', await p.locator('[role=radiogroup][aria-label="Pass tier"] >> text=/PKR/').count());
 // sign-up form: blur validation + phone picker
 await p.goto(B+'/account?mode=signup'); await p.waitForTimeout(800);
 const fn=p.locator('input#firstName, input[name=firstName]').first(); if (await fn.count()) { await fn.focus(); await fn.blur(); await p.waitForTimeout(200); out('blur msg', await p.locator('.fg-msg').first().innerText().catch(()=>'none')); }
 out('country code select', await p.locator('select[aria-label="Country code"]').count());
 await p.screenshot({path:'/tmp/fl/b-signup.png', fullPage:true});
 // my registrations: unknown number
 await p.goto(B+'/my-registrations'); await p.fill('#lk-phone','03009999999'); await p.getByRole('button',{name:'Send me a code'}).click(); await p.waitForTimeout(1200); out('lookup unknown', (await p.locator('[role=alert]').first().innerText().catch(()=>'none')).slice(0,90));
 await p.goto(B+'/feedback/symposium'); out('sym feedback page', await p.locator('text=Overall, how would you rate the symposium?').count());
 await p.goto(B+'/workshops'); await p.waitForTimeout(800); await p.evaluate(()=>window.scrollTo(0,2500)); await p.waitForTimeout(300); const tabs=p.locator('[role=tab]'); if (await tabs.count()>1) { await tabs.nth(1).click(); await p.waitForTimeout(900); out('scroll after tab', await p.evaluate(()=>Math.round(window.scrollY))); }
 await b.close(); })();
