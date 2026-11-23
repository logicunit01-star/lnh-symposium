// 23 Nov 2026: GTM-W2W8D2H4 replaces direct GA4. Server on 3100 with APP_URL = live address.
const { chromium } = require('playwright'); const B='http://127.0.0.1:3100';
(async()=>{ const b=await chromium.launch(); const c=await b.newContext(); const p=await c.newPage(); const loaded=[];
 await c.route('https://www.googletagmanager.com/**', r=>{ loaded.push(r.request().url()); r.fulfill({status:200, contentType:'application/javascript', body:'/* stub */'}); });
 const csp=[]; p.on('console',m=>{ if(/Content Security Policy/i.test(m.text())) csp.push(m.text().slice(0,120)); });
 await p.goto(B+'/register/success/abcdefSECRETTOKEN?paid=1'); await p.waitForTimeout(1200);
 console.log('1 landing on e-ticket page: GTM requested =', loaded.length);
 await p.goto(B+'/feedback?t=SECRET2'); await p.waitForTimeout(800);
 console.log('2 ?t= page: GTM requested =', loaded.length);
 await p.goto(B+'/'); await p.waitForTimeout(1500);
 console.log('3 home: requested', loaded.map(u=>u.replace(/^https:\/\//,'')).join(', '));
 await p.click('header a[href="/awards"]').catch(async()=>{ await p.evaluate(()=>{ const a=document.querySelector('a[href="/awards"]'); a && a.click(); }); }); await p.waitForTimeout(1000);
 const dl = await p.evaluate(()=>JSON.stringify(window.dataLayer||[]));
 console.log('4 dataLayer:', dl.slice(0,700));
 console.log('5 gtm.js loads:', loaded.length, '| gtag/js direct:', loaded.some(u=>u.includes('gtag/js')), '| token leaked:', /SECRET/.test(dl), '| CSP errors:', csp.length);
 const a=await c.newPage(); await a.goto(B+'/admin/login'); await a.waitForTimeout(800);
 console.log('6 admin tracked:', await a.evaluate(()=>!!window.dataLayer));
 await b.close(); })();
