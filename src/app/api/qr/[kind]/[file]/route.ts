import QRCode from "qrcode";
import { loadRegistration } from "@/lib/registration";
import { qrPayload, ticketPayload } from "@/lib/qr-payload";
import { qrSigOk, type QrKind } from "@/lib/qr-link";
import { db, schema as s } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
/**
 * Public QR code image for WhatsApp (14.11.2026 Part C): /api/qr/r/<registration id>.png?k=… (symposium) or
 * /api/qr/t/<ticket id>.png?k=… (one workshop). Only with the right key and only for a confirmed registration.
 */
export async function GET(req: Request, { params }: { params: { kind: string; file: string } }) {
  const kind = params.kind as QrKind, id = params.file.replace(/\.png$/i, "");
  const nope = () => new Response("Not found", { status: 404 });
  if ((kind !== "r" && kind !== "t") || !/^[\w-]{8,64}$/.test(id) || !qrSigOk(kind, id, new URL(req.url).searchParams.get("k"))) return nope();
  let regId = id;
  if (kind === "t") { const [it] = await db.select({ r: s.registrationItems.registrationId }).from(s.registrationItems).where(eq(s.registrationItems.id, id)); if (!it) return nope(); regId = it.r; }
  const r = await loadRegistration({ id: regId });
  if (!r || !(r.paymentStatus === "PAID" || r.paymentStatus === "WAIVED")) return nope();
  const item = kind === "t" ? r.items.find((i) => i.id === id) : null;
  if (kind === "t" && !item) return nope();
  const png = await QRCode.toBuffer(item ? ticketPayload(r, item) : qrPayload(r), { margin: 2, width: 600, errorCorrectionLevel: "M" });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600", "X-Robots-Tag": "noindex" } });
}
