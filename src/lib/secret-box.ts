import "server-only";
import crypto from "node:crypto";

/** AES-256-GCM for settings secrets (mail passwords). The key is derived from AUTH_SECRET and a label per use. */
const key = (label: string) => crypto.createHash("sha256").update(`${process.env.AUTH_SECRET || "dev-secret-change-me-dev-secret-change-me"}:${label}:v1`).digest();
export function sealText(label: string, plain: string): string {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", key(label), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1.${iv.toString("base64")}.${c.getAuthTag().toString("base64")}.${data.toString("base64")}`;
}
/** null when it cannot be decrypted (AUTH_SECRET changed): the admin must enter the secret again. */
export function openText(label: string, sealed: string | null | undefined): string | null {
  if (!sealed) return "";
  try {
    const [ver, iv, tag, data] = sealed.split(".");
    if (ver !== "v1") return null;
    const d = crypto.createDecipheriv("aes-256-gcm", key(label), Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
  } catch { return null; }
}
