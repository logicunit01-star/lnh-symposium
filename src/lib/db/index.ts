import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

/**
 * DATABASE_URL:
 *  - postgresql://user:pass@host:5432/db  → real PostgreSQL (recommended for production)
 *  - pglite:./.data/lnh  (or empty)       → embedded PostgreSQL stored in a local folder — no install needed
 */
type DB = NodePgDatabase<typeof schema>;
const url = process.env.DATABASE_URL || "pglite:./.data/lnh";
export const isEmbedded = !/^postgres(ql)?:\/\//.test(url);

const g = globalThis as unknown as { __lnhDb?: DB };

function create(): DB {
  if (isEmbedded && process.env.VERCEL) {
    throw new Error("DATABASE_URL must point to a PostgreSQL database when running on Vercel (e.g. Neon).");
  }
  if (isEmbedded) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PGlite } = require("@electric-sql/pglite");
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { drizzle } = require("drizzle-orm/pglite");
    const dir = url.replace(/^pglite:/, "") || "./.data/lnh";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("fs").mkdirSync(require("path").dirname(dir), { recursive: true });
    return drizzle(new PGlite(dir), { schema }) as DB;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require("pg");
  return drizzlePg(new Pool({ connectionString: url, max: process.env.VERCEL ? 3 : 10 }), { schema });
}

export const db: DB = g.__lnhDb ?? (g.__lnhDb = create());
export { schema };
export type { DB };
