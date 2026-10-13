import { sql } from "drizzle-orm";
import { db } from "./db";

/** Atomically increments a named counter and returns the new value. Pass `tx` when inside a transaction. */
export async function nextNumber(key: string, conn: { execute: typeof db.execute } = db): Promise<number> {
  const r = await conn.execute<{ value: number }>(sql`
    INSERT INTO counters (key, value) VALUES (${key}, 1)
    ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
    RETURNING value`);
  return Number((r as any).rows[0].value);
}
export const pad = (n: number, w = 4) => String(n).padStart(w, "0");
