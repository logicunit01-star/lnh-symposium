// Simple in-memory fixed-window limiter (per instance). Use Redis/Upstash for multi-instance deployments.
const hits = new Map<string, { n: number; t: number }>();
export function rateLimit(key: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.t > windowMs) { hits.set(key, { n: 1, t: now }); return true; }
  h.n++;
  return h.n <= limit;
}
export const ipOf = (req: Request) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
