// Start file for cPanel "Setup Node.js App" / Application Manager (Phusion Passenger) or PM2 on the LNH server.
// Passenger sets PORT (or passes a socket); locally `npm start` (next start) is still used.
// Run `npm run build` first. Database migrations run automatically on start (src/instrumentation-node.ts).
const { createServer } = require("http");
const next = require("next");

const port = process.env.PORT || 3000;
// LNH server: HOST=127.0.0.1 so only Apache (reverse proxy) can reach the app. Passenger passes its own socket in PORT: leave HOST unset there.
const host = process.env.HOST;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const srv = createServer((req, res) => handle(req, res));
  const ready = () => console.log(`LNH Symposium ready on ${host ? `${host}:` : ""}${port}`);
  host ? srv.listen(Number(port), host, ready) : srv.listen(port, ready);
}).catch((e) => { console.error(e); process.exit(1); });
