// Layout audit of the admin console (16 Nov 2026): horizontal page overflow and tables that need sideways scrolling.
const { chromium } = require('playwright'); const B='http://127.0.0.1:3100';
(async()=>{ const b=await chromium.launch(); const c=await b.newContext(); await c.request.post(B+'/api/admin/login',{data:{email:'admin@lnh.edu.pk',password:'ChangeMe!2026'}});
 const p=await c.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,120)));
 await p.setViewportSize({width:1366,height:900}); await p.goto(B+'/admin');
 let links=[...new Set(await p.$$eval('aside a[href^="/admin"], nav a[href^="/admin"]', as=>as.map(a=>a.getAttribute('href'))))];
 // a few detail pages
 for (const list of ['/admin/registrations','/admin/workshops','/admin/abstracts','/admin/sessions','/admin/users','/admin/departments']) { await p.goto(B+list); const h=await p.$$eval('a[href^="'+list+'/"], a[href^="'+list+'?u="], a[href^="'+list+'?e="]', as=>as.map(a=>a.getAttribute('href')).filter(x=>!/new|export/.test(x))[0]).catch(()=>null); if(h) links.push(h); }
 links=[...new Set(links)]; console.log('pages', links.length);
 for (const w of (process.argv[2]||'1366').split(',').map(Number)) {
  await p.setViewportSize({width:w,height:900}); console.log('== width',w);
  for (const l of links) {
   errs.length=0; await p.goto(B+l,{waitUntil:'load'}).catch(()=>{});
   const r=await p.evaluate(()=>{ const pageOver=document.documentElement.scrollWidth-innerWidth;
     const boxes=[...document.querySelectorAll('.overflow-x-auto')].map(el=>({over:el.scrollWidth-el.clientWidth, cw:el.clientWidth, sw:el.scrollWidth, head:(el.querySelector('th')?.closest('tr')?.innerText||el.innerText).replace(/\s+/g,' ').slice(0,60)})).filter(x=>x.over>8);
     const cramped=[...document.querySelectorAll('td')].filter(td=>td.clientWidth<70 && td.innerText.trim().length>12 && td.scrollHeight>120).length;
     return {pageOver, boxes, cramped}; });
   if (r.pageOver>1||r.boxes.length||r.cramped||errs.length) console.log(l,'| page+',r.pageOver,'| scroll:',r.boxes.map(x=>`${x.sw}/${x.cw} [${x.head}]`).join(' ; '),'| cramped cells',r.cramped, errs.length?'| ERR '+errs[0]:'');
  }
 }
 await b.close(); })();
