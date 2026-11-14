import crypto from "node:crypto";
import { appUrl } from "./utils";

/**
 * Public, unguessable address of a QR code image (14.11.2026 Part C). eOcean fetches it to attach the QR code to the
 * WhatsApp message, so it cannot need a sign-in. The key is an HMAC of the ID with AUTH_SECRET; without it the image is refused.
 * kind: "r" = a registration's symposium QR, "t" = one workshop ticket (registration item).
 */
export type QrKind = "r" | "t";
export const qrSig = (kind: QrKind, id: string) =>
  crypto.createHmac("sha256", process.env.AUTH_SECRET || "dev-secret-change-me-dev-secret-change-me").update(`qr:${kind}:${id}`).digest("base64url").slice(0, 32);
export const qrSigOk = (kind: QrKind, id: string, k: string | null) => {
  if (!k) return false;
  const a = Buffer.from(qrSig(kind, id)), b = Buffer.from(k);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
export const qrLink = (kind: QrKind, id: string) => `${appUrl()}/api/qr/${kind}/${id}.png?k=${qrSig(kind, id)}`;
