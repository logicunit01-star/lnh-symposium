import { sql } from "drizzle-orm";

/**
 * Fixed-window rate limiter. Audit 16 Nov 2026: counts are kept in the database (table rate_limits), so they hold
 * across Vercel instances and restarts; if the database is unreachable it falls back to memory for that instance.
 */
const hits = new Map<string, { n: number; t: number }>();
function memoryLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.t > windowMs) { hits.set(key, { n: 1, t: now }); return true; }
  h.n++;
  return h.n <= limit;
}
export async function rateLimit(key: string, limit = 10, windowMs = 60_000): Promise<boolean> {
  try {
    const { db } = await import("./db");
    const secs = Math.max(1, Math.round(windowMs / 1000));
    const r: any = await db.execute(sql`
      insert into rate_limits (key, window_start, hits) values (${key.slice(0, 200)}, now(), 1)
      on conflict (key) do update set
        hits = case when rate_limits.window_start < now() - make_interval(secs => ${secs}) then 1 else rate_limits.hits + 1 end,
        window_start = case when rate_limits.window_start < now() - make_interval(secs => ${secs}) then now() else rate_limits.window_start end
      returning hits`);
    const n = Number((r.rows ?? r)[0]?.hits ?? 1);
    if (Math.random() < 0.01) await db.execute(sql`delete from rate_limits where window_start < now() - interval '1 day'`).catch(() => {});
    return n <= limit;
  } catch {
    return memoryLimit(key, limit, windowMs);
  }
}

/**
 * The visitor's address. Audit 16 Nov 2026: the first X-Forwarded-For entry is whatever the visitor sends, so it is not
 * trusted. Vercel sets x-real-ip itself; behind the LNH Apache proxy the last X-Forwarded-For entry is the one Apache added.
 */
export const ipOf = (req: Request) => {
  if (process.env.VERCEL) return req.headers.get("x-real-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const xff = (req.headers.get("x-forwarded-for") || "").split(",").map((x) => x.trim()).filter(Boolean);
  return xff.at(-1) || req.headers.get("x-real-ip") || "local";
};

/** Failed-attempt limits (sign-in): only failures count, so many staff signing in from one office network are not blocked. */
export async function tooManyFailures(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const { db } = await import("./db");
    const r: any = await db.execute(sql`select hits from rate_limits where key = ${key.slice(0, 200)} and window_start >= now() - make_interval(secs => ${Math.round(windowMs / 1000)})`);
    return Number((r.rows ?? r)[0]?.hits ?? 0) >= limit;
  } catch {
    const h = hits.get(key);
    return !!h && Date.now() - h.t <= windowMs && h.n >= limit;
  }
}
export async function recordFailure(key: string, windowMs: number) {
  await rateLimit(key, Number.MAX_SAFE_INTEGER, windowMs);
}
