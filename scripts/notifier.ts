// lnh-notifier (14.11.2026 Part C): sends the outbox (emails, WhatsApp, SMS) as a process separate from the website.
// Run on the LNH server under PM2 (deploy/ecosystem.config.cjs) with NOTIFIER=worker in .env, so the website only queues.
// Needs PostgreSQL (DATABASE_URL); the embedded PGlite database cannot be opened by two processes.
// Manual run:  npm run notifier            (Ctrl+C stops it; a message being sent is finished first)
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { pathToFileURL } from "node:url";

// the app's server modules import "server-only" (a guard for Next.js); outside Next.js it is replaced by an empty module
const stub = pathToFileURL(path.join(__dirname, "server-only-stub.cjs")).href;
(Module as any).registerHooks({ resolve: (spec: string, ctx: unknown, next: (s: string, c: unknown) => unknown) => (spec === "server-only" ? { url: stub, shortCircuit: true } : next(spec, ctx)) });

let stopping = false;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { if (stopping) process.exit(1); stopping = true; console.log(`[notifier] ${sig}: stopping after the current message`); });

async function main() {
  if (fs.existsSync(".env")) process.loadEnvFile(".env");
  if (!/^postgres(ql)?:/.test(process.env.DATABASE_URL || "")) throw new Error("The notifier needs DATABASE_URL=postgresql://… (the embedded PGlite database is for local development only).");
  const { drainOutbox, rateLimiter } = await import("../src/lib/outbox");
  const { clearNotifyCache } = await import("../src/lib/notify-config");
  const { db, schema: s } = await import("../src/lib/db");
  const { sql } = await import("drizzle-orm");
  const limiter = rateLimiter();
  console.log(`[notifier] started (pid ${process.pid})`);
  let beat = 0;
  while (!stopping) {
    try {
      if (Date.now() - beat > 30_000) {
        beat = Date.now(); clearNotifyCache();
        await db.insert(s.notifySettings).values({ id: 1, workerSeenAt: new Date() }).onConflictDoUpdate({ target: s.notifySettings.id, set: { workerSeenAt: sql`now()` } });
      }
      const r = await drainOutbox({ max: 20, budgetMs: 25_000, limiter });
      if (r.sent || r.retry || r.failed) console.log(`[notifier] sent ${r.sent}, will retry ${r.retry}, failed ${r.failed}`);
      else await sleep(2_000);
    } catch (e) {
      console.error("[notifier] error", e);
      await sleep(10_000);
    }
  }
  process.exit(0);
}
main().catch((e) => { console.error("[notifier]", e.message || e); process.exit(1); });
