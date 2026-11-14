import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { settlePayment } from "@/lib/payments";
import { callbackAuthOk } from "@/lib/paypro";

export const dynamic = "force-dynamic";
/**
 * PayPro callback API ("paypro-invoices-callback-api-v2.1-POST.pdf"): https://{domain}/paypro/uis
 * POST { username, password, csvinvoiceids } — csvinvoiceids are our order numbers (payments.txnRef).
 * Answers one entry per invoice: 00 marked paid, 01 invalid data, 02 service failure, 03 no records found.
 */
export async function POST(req: Request) {
  let b: any = null;
  try { b = await req.json(); } catch { /* handled below */ }
  const reply = (rows: { StatusCode: string; InvoiceID: string | null; Description: string }[]) => Response.json(rows);
  if (!b || !b.username) return reply([{ StatusCode: "01", InvoiceID: null, Description: "Invalid Data. Username cannot be empty" }]);
  if (!b.password) return reply([{ StatusCode: "01", InvoiceID: null, Description: "Invalid Data. Password cannot be empty" }]);
  if (!(await callbackAuthOk(b.username, b.password))) return reply([{ StatusCode: "01", InvoiceID: null, Description: "Invalid Data. Username or password is invalid" }]);
  const ids = String(b.csvinvoiceids || "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 200);
  if (!ids.length) return reply([{ StatusCode: "03", InvoiceID: null, Description: "No data available" }]);
  const out = [];
  for (const id of ids) {
    try {
      const pay = await db.query.payments.findFirst({ where: eq(s.payments.txnRef, id) });
      if (!pay || pay.provider !== "paypro") { out.push({ StatusCode: "03", InvoiceID: id, Description: "No records found." }); continue; }
      await settlePayment(id, true, pay.providerRef || undefined, { ...((pay.raw as object) || {}), callback: { at: new Date().toISOString() } });
      out.push({ StatusCode: "00", InvoiceID: id, Description: "Invoice successfully marked as paid" });
    } catch (e) {
      console.error("PayPro callback", id, e);
      out.push({ StatusCode: "02", InvoiceID: id, Description: "Service Failure" });
    }
  }
  return reply(out);
}
