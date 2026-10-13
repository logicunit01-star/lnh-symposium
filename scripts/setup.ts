// One-step setup: creates/updates tables (migrations) and seeds settings, admin user and dummy content.
// Safe to run on every deploy (idempotent). Used by `npm run db:setup` and by Vercel's build (`vercel-build`).
import fs from "node:fs";

async function main() {
  if (fs.existsSync(".env")) process.loadEnvFile(".env");
  if (process.env.VERCEL && !/^postgres/.test(process.env.DATABASE_URL || "")) {
    throw new Error("DATABASE_URL is not set. In Vercel: Storage → Create Database → Neon (Postgres) → connect it to this project, then redeploy.");
  }
  const { db, isEmbedded } = await import("../src/lib/db");
  const folder = "./drizzle";
  if (isEmbedded) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as any, { migrationsFolder: folder });
  } else {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(db as any, { migrationsFolder: folder });
  }
  console.log(`Database ready (${isEmbedded ? "embedded PGlite" : "PostgreSQL"}).`);
  await import("./seed");
}
main().catch((e) => { console.error(e.message || e); process.exit(1); });
