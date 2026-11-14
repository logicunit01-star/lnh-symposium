// PM2 process file for the LNH server (see deploy/LNH-SERVER.md). Start: pm2 start deploy/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: "lnh-symposium",
    cwd: __dirname + "/..",
    script: "server.js",
    instances: 1, // one process: rate limits and the PayPro token cache are in memory
    exec_mode: "fork",
    max_memory_restart: "2G",
    env: { NODE_ENV: "production", PORT: "3000", HOST: "127.0.0.1" }, // the rest comes from .env (loaded by Next.js)
    out_file: "../logs/lnh-out.log",
    error_file: "../logs/lnh-error.log",
    time: true,
  }, {
    // Sends the outbox (emails, WhatsApp, SMS) separately from the website; needs NOTIFIER=worker in .env (14.11.2026)
    name: "lnh-notifier",
    cwd: __dirname + "/..",
    script: "node_modules/tsx/dist/cli.mjs",
    args: "scripts/notifier.ts",
    instances: 1,
    exec_mode: "fork",
    max_memory_restart: "512M",
    kill_timeout: 30000, // lets the message being sent finish
    env: { NODE_ENV: "production" },
    out_file: "../logs/notifier-out.log",
    error_file: "../logs/notifier-error.log",
    time: true,
  }],
};
