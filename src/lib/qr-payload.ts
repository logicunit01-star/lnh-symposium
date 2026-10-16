import { fmtDate, SESSION_TYPE_LABEL } from "./utils";

type R = { regNo: string; title: string; firstName: string; lastName: string; phone: string; pmdcNo: string | null;
  items: { session: { title: string; type: string; startsAt: Date } }[] };

/** QR payload format requested by LNH (Workshop requirements §1.7). */
export function qrPayload(r: R) {
  return JSON.stringify({
    RegistrationID: r.regNo,
    RegistrantName: `${r.title} ${r.firstName} ${r.lastName}`,
    ContactNumber: r.phone.replace(/\D/g, ""),
    IdentityNumber: r.pmdcNo ? `PMDC-${r.pmdcNo}` : null,
    PaidItems: r.items.map((i) => `${i.session.type === "WORKSHOP" ? "Workshop" : SESSION_TYPE_LABEL[i.session.type] + " Session"}: ${i.session.title} (${fmtDate(i.session.startsAt, { day: "numeric", month: "short", year: "numeric" })})`),
  });
}
/** Extracts a registration number from a scanned QR (JSON payload, URL or plain text). */
export function regNoFromScan(raw: string) {
  try { const j = JSON.parse(raw); if (j?.RegistrationID) return String(j.RegistrationID).toUpperCase(); } catch {}
  return raw.match(/[A-Z]{2,6}-\d{4}-\d{3,}|LNH\d{2}-\d{3,}/i)?.[0]?.toUpperCase() ?? raw.trim();
}
