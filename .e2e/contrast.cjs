// Text contrast audit (WCAG 2.1 AA) of the public site in light and dark theme. Usage: node .e2e/contrast.cjs [light|dark|both] [token]
const { chromium } = require('playwright');
const B = 'http://localhost:3000';
const PAGES = ['/', '/about', '/committee', '/awards', '/venues', '/contact', '/agenda', '/programme/plenary', '/programme/pre-symposium-activities', '/programme/inaugural-session', '/speakers', '/sessions', '/workshops', '/workshops/ws-trauma-team-simulation', '/abstracts', '/abstracts/book', '/register', '/register/guest', '/register/volunteer', '/account', '/my-registrations', '/feedback', '/feedback/workshops', '/search?q=ai', '/certificates', '/checkout', '/nope'];
const themes = (process.argv[2] || 'both') === 'both' ? ['light', 'dark'] : [process.argv[2]];
const extra = process.argv[3] ? [`/register/success/${process.argv[3]}`] : [];
(async () => {
  const b = await chromium.launch();
  const report = {};
  for (const th of themes) {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
    await ctx.addInitScript((t) => { try { localStorage.setItem('lnh-theme', t); } catch {} }, th);
    const p = await ctx.newPage();
    const byClass = {}; let total = 0, fails = 0; const perPage = {};
    for (const u of [...PAGES, ...extra]) {
      await p.goto(B + u, { waitUntil: 'networkidle' }).catch(() => {});
      await p.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;transition:none!important} *{animation:none!important}' }).catch(() => {});
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
      await p.waitForTimeout(400);
      const r = await p.evaluate(() => {
        const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
        const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1);
        const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
        const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
        const gradColors = (img) => (img.match(/rgba?\([^)]+\)/g) || []).map(parse);
        // background stack from the element up; each layer may be a colour or a gradient (several candidates -> worst case)
        function bgs(el) {
          const layers = [];
          for (let e = el; e; e = e.parentElement) {
            const cs = getComputedStyle(e);
            const g = cs.backgroundImage && cs.backgroundImage.includes('gradient') ? gradColors(cs.backgroundImage) : [];
            const c = parse(cs.backgroundColor);
            if (g.length) layers.push(g); else if (c && c[3] > 0) layers.push([c]);
            if (c && c[3] >= 0.99 && !g.length) break;
          }
          let base = [[255, 255, 255, 1]]; const body = parse(getComputedStyle(document.body).backgroundColor); if (body && body[3] > 0) base = [body];
          for (const L of layers.reverse()) { const nb = []; for (const b0 of base) for (const c of L) nb.push(over(c, b0)); base = nb.slice(0, 12); }
          return base;
        }
        const out = []; let n = 0;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        while (walker.nextNode()) {
          const t = walker.currentNode; const el = t.parentElement;
          if (!el || seen.has(el) || !t.textContent.trim() || t.textContent.trim().length < 2) continue;
          seen.add(el);
          if (el.closest('svg,script,style,noscript,[aria-hidden="true"],.sr-only,option')) continue;
          if (/text-(grad|holo)|bg-clip-text/.test(el.closest('[class*="text-grad"],[class*="text-holo"],[class*="bg-clip-text"],[class*="text-lnh-title"]')?.className || '')) continue; // gradient text: checked by eye
          const rect = el.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none') continue;
          let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
          if (op < 0.15) continue; // animated-in or decorative
          if (el.closest('[class*="bg-[url"],img')) continue;
          const fg0 = parse(cs.color); if (!fg0) continue;
          const size = parseFloat(cs.fontSize), weight = Number(cs.fontWeight) || 400;
          const large = size >= 24 || (size >= 18.66 && weight >= 700);
          const need = large ? 3 : 4.5;
          let worst = 99, worstBg = null;
          for (const bg of bgs(el)) { const fg = [fg0[0], fg0[1], fg0[2], fg0[3] * op]; const r = ratio(over(fg, bg), bg); if (r < worst) { worst = r; worstBg = bg; } }
          n++;
          if (el.closest('button[disabled],[aria-disabled="true"]')) continue; // disabled controls are exempt
          if (worst < need) out.push({ text: t.textContent.trim().slice(0, 50), ratio: Math.round(worst * 100) / 100, need, cls: (typeof el.className === 'string' ? el.className : '').split(/\s+/).filter((c) => /(^|:)(text-|opacity-)/.test(c)).join(' '), tag: el.tagName.toLowerCase(), color: cs.color, bg: worstBg && `rgb(${worstBg.slice(0, 3).map(Math.round).join(',')})` });
        }
        return { n, out };
      });
      total += r.n; fails += r.out.length; perPage[u] = r.out.length;
      for (const f of r.out) { const k = `${f.cls || f.tag} | ${f.color} on ${f.bg}`; (byClass[k] ??= { n: 0, min: 99, ex: [] }); byClass[k].n++; byClass[k].min = Math.min(byClass[k].min, f.ratio); if (byClass[k].ex.length < 2) byClass[k].ex.push(`${u}: "${f.text}" ${f.ratio}`); }
    }
    report[th] = { total, fails, perPage: Object.fromEntries(Object.entries(perPage).filter(([, v]) => v)), top: Object.entries(byClass).sort((a, b) => b[1].n - a[1].n).slice(0, 40) };
    await ctx.close();
  }
  for (const th of themes) {
    const R = report[th];
    console.log(`\n===== ${th.toUpperCase()}: ${R.fails} of ${R.total} text elements below AA =====`);
    console.log('per page:', JSON.stringify(R.perPage));
    for (const [k, v] of R.top) console.log(`${String(v.n).padStart(4)}  min ${v.min}  ${k}\n        ${v.ex.join(' || ')}`);
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
