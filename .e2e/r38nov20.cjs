// 20 Nov document + logo + venue chips (23 Nov 2026). Server on 3100.
const { chromium } = require('playwright'); const B='http://127.0.0.1:3100';
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1366,height:900}}); const p=await c.newPage(); const o=(...a)=>console.log(...a);
 await p.goto(B+'/', {waitUntil:'domcontentloaded'}); await p.waitForTimeout(1200);
 o('logo href:', await p.locator('header a[aria-label="9th LNH Symposium home"]').first().getAttribute('href').catch(()=>'none'));
 o('ticker:', [...new Set((await p.locator('section').filter({hasText:'Avail Early-Bird'}).first().innerText().catch(()=>'')).split('\n').map(x=>x.trim()).filter(Boolean))].slice(0,6).join(' | '));
 const g = p.locator('section').filter({hasText:'At a glance'}).first(); o('glance:', (await g.innerText()).replace(/\s+/g,' ').slice(0,140), '| day cards:', await g.locator('.hud').count());
 o('workshop button:', await p.locator('a[href="/workshops"].btn-blue').first().innerText());
 await g.scrollIntoViewIfNeeded(); await p.waitForTimeout(600); await p.screenshot({path:'/tmp/fl/n-glance.png'});
 for (const u of ['/agenda','/workshops','/certificates']) { await p.goto(B+u,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(500); o(u, '→ coming soon:', await p.locator('text=Coming soon').count()>0, '| form/catalog:', await p.locator('form, [data-catalog]').count()); }
 await p.screenshot({path:'/tmp/fl/n-cert.png', fullPage:true});
 const slug = await (await c.request.get(B+'/api/agenda/csv')).text(); 
 await p.goto(B+'/about',{waitUntil:'domcontentloaded'}); await p.waitForTimeout(800); o('about eyebrow:', await p.locator('.eyebrow').first().innerText(), '| cards:', await p.locator('text=Who should attend').count()); await p.screenshot({path:'/tmp/fl/n-about.png'});
 await p.goto(B+'/',{waitUntil:'domcontentloaded'}); await p.locator('footer a', {hasText:'Radiology'}).click(); await p.waitForTimeout(1200);
 o('chip url:', p.url().replace(B,''), '| selected:', await p.locator('text=Radiology Tutorial Room').first().isVisible()); await p.screenshot({path:'/tmp/fl/n-venue.png'});
 await p.goto(B+'/venues?v=convention-centre#guide'); await p.waitForTimeout(800); o('convention:', await p.locator('h3, p').filter({hasText:/^Convention Centre$/}).count(), await p.locator('text=Auditorium and Halls A to D').isVisible());
 // staff preview
 await c.request.post(B+'/api/admin/login',{data:{email:process.env.AE,password:process.env.AP}});
 await p.goto(B+'/workshops'); await p.waitForTimeout(800); o('staff /workshops preview note:', await p.locator('text=Staff preview').count(), '| coming soon:', await p.locator('text=Coming soon').count());
 await p.goto(B+'/admin'); await p.waitForTimeout(1000); o('admin logo href:', await p.locator('a[aria-label="Admin dashboard"]').first().getAttribute('href').catch(()=>'none'));
 await b.close(); })();
