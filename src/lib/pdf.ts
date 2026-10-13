import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { fmtDate, fmtDateTime, fmtTime, pkr, appUrl } from "./utils";

const NAVY = rgb(0.039, 0.18, 0.43);
const BLUE = rgb(0.082, 0.376, 0.83);
const RED = rgb(0.82, 0.098, 0.18);
const GREY = rgb(0.36, 0.42, 0.55);
const INK = rgb(0.04, 0.1, 0.23);

async function qrPng(doc: PDFDocument, text: string) {
  const data = await QRCode.toBuffer(text, { margin: 1, width: 300, color: { dark: "#0A2E6E", light: "#FFFFFF" } });
  return doc.embedPng(data);
}
function wrap(text: string, font: PDFFont, size: number, max: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (font.widthOfTextAtSize(t, size) > max && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
const safe = (s: unknown) => String(s ?? "—").replace(/[^\x20-\x7E]/g, (c) => ({ "—": "-", "–": "-", "’": "'", "‘": "'", "“": '"', "”": '"', "&": "&" } as any)[c] ?? "");

type RegForPdf = {
  regNo: string; accessToken: string; title: string; gender: string; firstName: string; lastName: string; email: string; phone: string;
  pmdcNo: string | null; specialty: string | null; designation: string | null; institution: string; address: string | null; city: string | null;
  conferenceFee: number; totalFee: number; earlyBird: boolean; paymentStatus: string; createdAt: Date;
  category: { label: string };
  items: { fee: number; session: { title: string; startsAt: Date; endsAt: Date; hall: string | null; type: string } }[];
};

export async function registrationPdf(r: RegForPdf, ev: { name: string; theme: string; venue: string; startDate: Date; endDate: Date }) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Registration ${r.regNo}`);
  const page = doc.addPage([595, 842]);
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const W = 595;

  page.drawRectangle({ x: 0, y: 742, width: W, height: 100, color: NAVY });
  page.drawRectangle({ x: 0, y: 738, width: W, height: 4, color: RED });
  page.drawText("LIAQUAT NATIONAL HOSPITAL", { x: 40, y: 808, size: 9, font: b, color: rgb(0.7, 0.8, 1) });
  page.drawText(safe(ev.name), { x: 40, y: 784, size: 20, font: b, color: rgb(1, 1, 1) });
  page.drawText(safe(ev.theme), { x: 40, y: 764, size: 10, font: f, color: rgb(0.85, 0.9, 1) });

  page.drawText("REGISTRATION CONFIRMATION", { x: 40, y: 705, size: 10, font: b, color: RED });
  page.drawText(r.regNo, { x: 40, y: 678, size: 26, font: b, color: INK });
  page.drawText(`Registered on ${fmtDateTime(r.createdAt)}`, { x: 40, y: 660, size: 9, font: f, color: GREY });
  const status = r.paymentStatus === "PAID" || r.paymentStatus === "WAIVED" ? "CONFIRMED" : "PAYMENT PENDING";
  page.drawRectangle({ x: 40, y: 630, width: b.widthOfTextAtSize(status, 9) + 20, height: 20, color: status === "CONFIRMED" ? rgb(0.05, 0.55, 0.3) : rgb(0.85, 0.55, 0.05) });
  page.drawText(status, { x: 50, y: 636, size: 9, font: b, color: rgb(1, 1, 1) });

  const qr = await qrPng(doc, `${appUrl()}/r/${r.regNo}`);
  page.drawImage(qr, { x: W - 40 - 110, y: 600, width: 110, height: 110 });
  page.drawText("Show at registration desk", { x: W - 150, y: 590, size: 7, font: f, color: GREY });

  let y = 570;
  const section = (t: string) => { page.drawText(t.toUpperCase(), { x: 40, y, size: 9, font: b, color: BLUE }); y -= 6; page.drawLine({ start: { x: 40, y }, end: { x: W - 40, y }, thickness: 0.5, color: rgb(0.85, 0.88, 0.94) }); y -= 16; };
  const row = (k: string, v: string) => { page.drawText(k, { x: 40, y, size: 9, font: f, color: GREY }); page.drawText(safe(v).slice(0, 80), { x: 190, y, size: 10, font: b, color: INK }); y -= 17; };

  section("Participant details");
  row("Name", `${r.title} ${r.firstName} ${r.lastName}`);
  row("Gender", r.gender);
  row("Email", r.email);
  row("Contact No.", r.phone);
  row("PMDC No.", r.pmdcNo || "-");
  row("Specialty", r.specialty || "-");
  row("Designation", r.designation || "-");
  row("Hospital / Institution", r.institution);
  row("Address", [r.address, r.city].filter(Boolean).join(", ") || "-");
  row("Category", r.category.label);
  y -= 8;
  section("Participation & fee summary");
  page.drawText(`Conference registration${r.earlyBird ? " (early-bird)" : ""}`, { x: 40, y, size: 10, font: f, color: INK });
  page.drawText(pkr(r.conferenceFee), { x: W - 40 - b.widthOfTextAtSize(pkr(r.conferenceFee), 10), y, size: 10, font: b, color: INK }); y -= 17;
  for (const it of r.items) {
    const line = `${it.session.title}`;
    const lines = wrap(safe(line), f, 10, 360);
    page.drawText(lines[0], { x: 40, y, size: 10, font: f, color: INK });
    const fee = it.fee ? pkr(it.fee) : "Included";
    page.drawText(fee, { x: W - 40 - b.widthOfTextAtSize(fee, 10), y, size: 10, font: b, color: INK }); y -= 13;
    page.drawText(`${fmtDate(it.session.startsAt, { weekday: "short", day: "numeric", month: "short" })}, ${fmtTime(it.session.startsAt)}-${fmtTime(it.session.endsAt)}  |  ${safe(it.session.hall)}`, { x: 40, y, size: 8, font: f, color: GREY }); y -= 16;
    if (y < 140) break;
  }
  page.drawLine({ start: { x: 40, y: y + 4 }, end: { x: W - 40, y: y + 4 }, thickness: 1, color: NAVY }); y -= 12;
  page.drawText("TOTAL", { x: 40, y, size: 11, font: b, color: INK });
  page.drawText(pkr(r.totalFee), { x: W - 40 - b.widthOfTextAtSize(pkr(r.totalFee), 13), y, size: 13, font: b, color: RED });

  page.drawRectangle({ x: 0, y: 0, width: W, height: 70, color: rgb(0.95, 0.96, 0.99) });
  page.drawText(safe(`${ev.venue}  |  ${fmtDate(ev.startDate, { day: "numeric", month: "short" })} - ${fmtDate(ev.endDate)}`), { x: 40, y: 42, size: 8, font: f, color: GREY });
  page.drawText(safe(`Manage your registration: ${appUrl()}/register/status`), { x: 40, y: 28, size: 8, font: f, color: GREY });
  return doc.save();
}

export async function certificatePdf(p: { name: string; certificateNo: string; eventName: string; theme: string; dates: string; items: string[]; cme?: number }) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Certificate ${p.certificateNo}`);
  const page: PDFPage = doc.addPage([842, 595]);
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const b = await doc.embedFont(StandardFonts.HelveticaBold);
  const ti = await doc.embedFont(StandardFonts.TimesRomanBoldItalic);
  const W = 842, H = 595;
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: 0, width: 26, height: H, color: NAVY });
  page.drawRectangle({ x: 26, y: 0, width: 6, height: H, color: RED });
  page.drawRectangle({ x: 56, y: 28, width: W - 84, height: H - 56, borderColor: rgb(0.8, 0.85, 0.94), borderWidth: 1 });
  const center = (t: string, y: number, size: number, font: PDFFont, color = INK) =>
    page.drawText(t, { x: 32 + (W - 32 - font.widthOfTextAtSize(t, size)) / 2, y, size, font, color });
  center("LIAQUAT NATIONAL HOSPITAL & MEDICAL COLLEGE", 510, 11, b, BLUE);
  center(safe(p.eventName), 486, 14, b, INK);
  center("CERTIFICATE OF PARTICIPATION", 430, 26, b, NAVY);
  center("This is to certify that", 390, 12, f, GREY);
  center(safe(p.name), 345, 34, ti, RED);
  page.drawLine({ start: { x: 250, y: 335 }, end: { x: W - 218, y: 335 }, thickness: 0.6, color: rgb(0.8, 0.85, 0.94) });
  center(safe(`attended the ${p.eventName} — "${p.theme}"`), 305, 12, f, INK);
  center(safe(`held at Liaquat National Hospital, Karachi, ${p.dates}.`), 287, 12, f, INK);
  if (p.items.length) {
    const lines = wrap(safe("Including: " + p.items.join("; ")), f, 10, 600).slice(0, 3);
    lines.forEach((l, i) => center(l, 258 - i * 14, 10, f, GREY));
  }
  if (p.cme) center(`CME credit hours: ${p.cme}`, 210, 10, b, BLUE);
  const sig = (x: number, label: string) => {
    page.drawLine({ start: { x, y: 130 }, end: { x: x + 170, y: 130 }, thickness: 0.8, color: INK });
    page.drawText(label, { x: x + (170 - f.widthOfTextAtSize(label, 9)) / 2, y: 116, size: 9, font: f, color: GREY });
  };
  sig(130, "Chairperson, Organizing Committee");
  sig(W - 330, "Principal, LNH&MC");
  const verify = `${appUrl()}/verify/${p.certificateNo}`;
  const qr = await qrPng(doc, verify);
  page.drawImage(qr, { x: W / 2 - 34, y: 76, width: 68, height: 68 });
  center(`Certificate No. ${p.certificateNo}  |  Verify at ${verify}`, 56, 8, f, GREY);
  return doc.save();
}
