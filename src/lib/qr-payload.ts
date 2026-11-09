import { fmtDate, fmtTime24 } from "./utils";

type R = { regNo: string; title: string; firstName: string; lastName: string; phone: string; pmdcNo: string | null; hasPass?: boolean; banquetQty?: number; regType?: string;
  items: { ticketNo?: string | null; session: { title: string; type: string; startsAt: Date; hall?: string | null } }[] };
type Item = R["items"][number];

const person = (r: R) => ({
  RegistrationID: r.regNo,
  RegistrantName: `${r.title} ${r.firstName} ${r.lastName}`,
  ContactNumber: r.phone.replace(/\D/g, ""),
  IdentityNumber: r.pmdcNo ? `PMDC-${r.pmdcNo}` : null,
});

/**
 * Symposium Pass QR (LNH workshop requirements §1.7 format, release 3 / D4: every ticket has its own QR with the holder's details).
 * Orders without a pass (workshop tickets only) get a registration QR that lists their tickets.
 */
export function qrPayload(r: R) {
  const pass = r.hasPass ?? true;
  return JSON.stringify({
    TicketType: pass ? "Symposium Pass" : "Registration",
    TicketID: r.regNo,
    ...person(r),
    ...(pass && (r.regType ?? "PARTICIPANT") === "PARTICIPANT" ? { BanquetPasses: 1 + (r.banquetQty ?? 0) } : {}),
    PaidItems: r.items.map((i) => `Workshop: ${i.session.title} (${fmtDate(i.session.startsAt, { day: "numeric", month: "short", year: "numeric" })})`),
  });
}

/** Workshop ticket QR: one per workshop, scanned at that workshop's door. */
export function ticketPayload(r: R, i: Item) {
  return JSON.stringify({
    TicketType: "Workshop",
    TicketID: i.ticketNo ?? r.regNo,
    ...person(r),
    Workshop: i.session.title,
    Date: `${fmtDate(i.session.startsAt, { day: "numeric", month: "short", year: "numeric" })} ${fmtTime24(i.session.startsAt)}`,
    Venue: i.session.hall ?? null,
  });
}

/** Reads a scanned QR (JSON payload, URL or plain text): the registration number and, for a workshop ticket, its ticket number. */
export function parseScan(raw: string): { regNo: string; ticketNo: string | null } {
  try {
    const j = JSON.parse(raw);
    if (j?.RegistrationID) return { regNo: String(j.RegistrationID).toUpperCase(), ticketNo: j.TicketType === "Workshop" && j.TicketID ? String(j.TicketID).toUpperCase() : null };
  } catch {}
  const t = raw.match(/([A-Z]{2,6}-\d{4}-\d{3,}(?:-\d+)?)-W\d+/i);
  if (t) return { regNo: t[1].toUpperCase(), ticketNo: t[0].toUpperCase() };
  return { regNo: raw.match(/[A-Z]{2,6}-\d{4}-\d{3,}(?:-\d+)?|LNH\d{2}-\d{3,}/i)?.[0]?.toUpperCase() ?? raw.trim(), ticketNo: null };
}
/** @deprecated kept for older callers */
export const regNoFromScan = (raw: string) => parseScan(raw).regNo;
