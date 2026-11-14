// eOcean xNotify stand-in for tests (port 4566). Writes each request (and the fetched QR image) as a JSON line to argv[2].
// POST /v2/send; POST /fail-on and /fail-off switch failure answers (HTTP 500) for retry tests.
const http = require("http"), fs = require("fs");
const OUT = process.argv[2]; let fail = false, n = 0;
http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", async () => {
    if (req.url === "/fail-on" || req.url === "/fail-off") { fail = req.url === "/fail-on"; return res.end("ok"); }
    const rec = { at: Date.now(), url: req.url, key: req.headers["x-api-key"], auth: req.headers.authorization, body: JSON.parse(b || "{}") };
    if (rec.body.pdf_url) { try { const r = await fetch(rec.body.pdf_url); const buf = Buffer.from(await r.arrayBuffer()); rec.media = { status: r.status, type: r.headers.get("content-type"), bytes: buf.length, png: buf.subarray(1, 4).toString() === "PNG" }; } catch (e) { rec.media = { error: String(e) }; } }
    rec.answered = fail ? 500 : 200;
    fs.appendFileSync(OUT, JSON.stringify(rec) + "\n");
    res.writeHead(fail ? 500 : 200, { "content-type": "application/json" });
    res.end(JSON.stringify(fail ? { status: "error", message: "temporary failure" } : { status: "success", id: `XN-${++n}` }));
  });
}).listen(4566, "127.0.0.1", () => console.log("xnotify mock on 4566"));
