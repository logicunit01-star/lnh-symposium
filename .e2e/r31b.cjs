const { chromium } = require('playwright'); const B='http://127.0.0.1:3100';
(async()=>{ const b=await chromium.launch(); const c=await b.newContext(); await c.request.post(B+'/api/admin/login',{data:{email:'admin@lnh.edu.pk',password:'ChangeMe!2026'}}); const p=await c.newPage();
 const e=await (async()=>{await p.goto(B+'/admin/departments'); return await p.$eval('a[href*="?e="]',a=>a.getAttribute('href'));})(); console.log('edit link',e);
 for (const [w,u0] of [[1536,'/admin/departments'],[1536,'/admin/departments?e=1'],[1800,'/admin/departments?e=1'],[1280,'/admin/departments?e=1']]) {
  const u=u0.replace('/admin/departments?e=1',e); await p.setViewportSize({width:w,height:900}); await p.goto(B+u);
  const r=await p.evaluate(()=>[...document.querySelectorAll('.overflow-x-auto')].map(el=>`${el.scrollWidth}/${el.clientWidth}`));
  const asideTop=await p.evaluate(()=>{const a=document.querySelector('form[action] h2')?.closest('aside'); const t=document.querySelector('table'); return a&&t? (a.getBoundingClientRect().top<t.getBoundingClientRect().top?'editor above table':'editor beside/below'):'no editor';});
  console.log(w,u,r.join(' '),asideTop); if(w===1536&&u.includes('e=1')) await p.screenshot({path:'/tmp/fl/dept.png'}); }
 await b.close(); })();
