// Local stand-in for PayPro API v2 (demoapi) used by .e2e/r6paypro.cjs. Port 4555.
const http = require('http');
const orders = new Map(); let n = 0; const TOKEN = 'tok-123';
http.createServer((req, res) => {
  let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    const u = new URL(req.url, 'http://x'); const j = b ? JSON.parse(b) : null;
    const send = (code, obj, h = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', ...h }); res.end(JSON.stringify(obj)); };
    if (u.pathname === '/v2/ppro/auth') return j.clientid === 'cid' && j.clientsecret === 'sec' ? send(200, [{ Status: '00' }], { Token: TOKEN }) : send(401, [{ Status: '01' }]);
    if (u.pathname === '/pay') { // customer page: ?bid=&callback_url=&act=pay|fail
      const o = orders.get(u.searchParams.get('bid')); const act = u.searchParams.get('act') || 'pay';
      if (act === 'pay') o.status = 'PAID';
      const cb = u.searchParams.get('callback_url'); res.writeHead(302, { Location: `${cb}&ordId=${u.searchParams.get('bid')}&status=${act === 'pay' ? 'success' : 'failure'}&msg=x` }); return res.end();
    }
    if (u.pathname === '/_debug') return send(200, [...orders.entries()]);
    if (u.pathname === '/_markpaid') { orders.get(u.searchParams.get('id')).status = 'PAID'; return send(200, {}); }
    if (req.headers.token !== TOKEN) return send(401, [{ Status: '01', Description: 'token' }]);
    if (u.pathname === '/v2/ppro/co' && req.method === 'POST') {
      const o = j[1]; const id = '0110' + String(++n).padStart(10, '0');
      orders.set(id, { ...o, status: 'UNPAID', merchant: j[0].MerchantId });
      return send(200, [{ Status: '00' }, { PayProId: id, Click2Pay: `http://localhost:4555/pay?bid=${id}`, OrderNumber: o.OrderNumber }]);
    }
    if (u.pathname === '/v2/ppro/ggos' && req.method === 'GET') {
      const o = orders.get(j.cpayId); if (!o) return send(200, [{ Status: '03' }]);
      return send(200, [{ Status: '00' }, { DatePaid: '', AmountPayable: Number(o.OrderAmount), OrderNumber: o.OrderNumber, CustomerName: o.CustomerName, OrderStatus: o.status, OrderAmountPaid: o.status === 'PAID' ? Number(o.OrderAmount) : 0 }]);
    }
    send(404, {});
  });
}).listen(4555, () => console.log('paypro mock on 4555'));
