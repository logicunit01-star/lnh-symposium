const { chromium } = require('playwright'); const B='http://127.0.0.1:3100';
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1366,height:900}}); const p=await c.newPage();
 await p.goto(B+'/', {waitUntil:'domcontentloaded'}); await p.waitForTimeout(1200);
 await p.locator('text=Call for abstracts').scrollIntoViewIfNeeded(); await p.waitForTimeout(800); await p.screenshot({path:'/tmp/fl/r-abs.png'});
 await p.evaluate(()=>{ document.documentElement.dataset.theme='dark'; window.scrollTo(0,0); }); await p.waitForTimeout(600); await p.screenshot({path:'/tmp/fl/r-dark.png', clip:{x:0,y:0,width:520,height:80}});
 await p.evaluate(()=>{ document.documentElement.dataset.theme='light'; });
 await p.goto(B+'/register', {waitUntil:'domcontentloaded'}); await p.waitForTimeout(1200); await p.screenshot({path:'/tmp/fl/r-reg.png'});
 await b.close(); })();
