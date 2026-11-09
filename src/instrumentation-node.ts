/**
 * Runs once when the server starts. Applies any pending database migrations (drizzle/*.sql) so a local
 * install never runs new code against an old database, even when started with `npm run dev` / `npm start`
 * directly instead of dev.bat / start.bat. On Vercel the build step (scripts/setup.ts) migrates instead.
 */
export async function migrateOnStart() {
  if (process.env.VERCEL || process.env.AUTO_MIGRATE === "0") return;
  const path = await import("node:path");
  const { db, isEmbedded } = await import("./lib/db");
  const folder = path.join(process.cwd(), "drizzle");
  try {
    if (isEmbedded) {
      const { migrate } = await import("drizzle-orm/pglite/migrator");
      await migrate(db as any, { migrationsFolder: folder });
    } else {
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      await migrate(db as any, { migrationsFolder: folder });
    }
    console.log("[db] migrations up to date");
  } catch (e: any) {
    console.error("[db] MIGRATION FAILED - the site will not work correctly until this is fixed:", e?.message || e);
  }
}
