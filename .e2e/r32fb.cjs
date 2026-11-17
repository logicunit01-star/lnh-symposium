const { chromium } = require('playwright'); const B='http://127.0.0.1:3100';
(async()=>{ const b=await chromium.launch(); const c=await b.newContext({viewport:{width:1280,height:1200}}); const p=await c.newPage();
 await p.goto(B+'/feedback'); const allWs = await p.locator('text=Workshop ·').count(); console.log('no token: workshop rows listed =', allWs, '| find-my-workshops card', await p.locator('text=Find my workshops').count());
 const tok=process.argv[2]; await p.goto(B+'/feedback?t='+tok); console.log('with token: heading', (await p.locator('h1').innerText()).slice(0,60)); console.log('your workshops:', (await p.locator('text=Your workshops').locator('..').innerText()).replace(/\s+/g,' ').slice(0,300));
 await p.screenshot({path:'/tmp/fl/fb.png', fullPage:true}); await b.close(); })();
