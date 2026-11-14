import crypto from "node:crypto";

/** Guest and volunteer forms open only with the access code from Event Settings (14.11.2026). */
export function guestCodeOk(ev: { guestCode: string | null }, code: unknown) {
  if (!ev.guestCode || typeof code !== "string" || !code) return false;
  const a = Buffer.from(code), b = Buffer.from(ev.guestCode);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
