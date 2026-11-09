import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fmtDate, fmtDateTime, fmtTime, fmtTime24, pkr, appUrl } from "./utils";
import { qrPayload, ticketPayload } from "./qr-payload";

// LNH colour codes (Nov 2026): navy #232667, red #B72025, cyan #00B8D7 → #0089BF
const NAVY = rgb(0x23 / 255, 0x26 / 255, 0x67 / 255);
const BLUE = rgb(0x00 / 255, 0x89 / 255, 0xbf / 255);
const RED = rgb(0xb7 / 255, 0x20 / 255, 0x25 / 255);
const GREY = rgb(0.36, 0.42, 0.55);
const INK = rgb(0.04, 0.1, 0.23);

async function qrPng(doc: PDFDocument, text: string) {
  const data = await QRCode.toBuffer(text, { margin: 1, width: 300, color: { dark: "#232667", light: "#FFFFFF" } });
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
  whatsapp?: string | null; cnic?: string | null; country?: string | null; province?: string | null; qualification?: string | null; employeeId?: string | null;
  banquetQty?: number; banquetFee?: number; hasPass?: boolean; regType?: string; guestRole?: string | null; guestSession?: string | null; department?: string | null; approvalStatus?: string | null;
  category: { label: string };
  items: { fee: number; ticketNo?: string | null; session: { title: string; startsAt: Date; endsAt: Date; hall: string | null; type: string } }[];
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
  const awaiting = !!r.regType && r.regType !== "PARTICIPANT" && r.approvalStatus !== "APPROVED";
  const status = awaiting ? "AWAITING APPROVAL" : r.paymentStatus === "PAID" || r.paymentStatus === "WAIVED" ? "CONFIRMED" : "PAYMENT PENDING";
  page.drawRectangle({ x: 40, y: 630, width: b.widthOfTextAtSize(status, 9) + 20, height: 20, color: status === "CONFIRMED" ? rgb(0.05, 0.55, 0.3) : rgb(0.85, 0.55, 0.05) });
  page.drawText(status, { x: 50, y: 636, size: 9, font: b, color: rgb(1, 1, 1) });

  const qr = await qrPng(doc, qrPayload(r));
  page.drawImage(qr, { x: W - 40 - 110, y: 600, width: 110, height: 110 });
  page.drawText("Show at registration desk", { x: W - 150, y: 590, size: 7, font: f, color: GREY });

  let y = 570;
  const section = (t: string) => { page.drawText(t.toUpperCase(), { x: 40, y, size: 9, font: b, color: BLUE }); y -= 6; page.drawLine({ start: { x: 40, y }, end: { x: W - 40, y }, thickness: 0.5, color: rgb(0.85, 0.88, 0.94) }); y -= 16; };
  const row = (k: string, v: string) => { page.drawText(k, { x: 40, y, size: 9, font: f, color: GREY }); page.drawText(safe(v).slice(0, 80), { x: 190, y, size: 10, font: b, color: INK }); y -= 17; };

  section("Participant details");
  row("Name", `${r.title} ${r.firstName} ${r.lastName}`);
  row("Gender", r.gender);
  row("Email", r.email);
  row("Cell / WhatsApp", [r.phone, r.whatsapp].filter(Boolean).join("  /  "));
  row(r.country && r.country !== "Pakistan" ? "Passport No." : "CNIC No.", r.cnic || "-");
  row("PMDC No.", r.pmdcNo || "-");
  row("Qualification", r.qualification || "-");
  row("Designation", r.designation || "-");
  row("Organization / Institute", r.institution);
  row("Address", [r.address, r.city, r.province, r.country].filter(Boolean).join(", ") || "-");
  if (r.employeeId) row("LNH employee #", r.employeeId);
  row("Category", r.regType === "GUEST" ? `Guest: ${r.guestRole ?? ""} · ${r.guestSession ?? ""}` : r.category.label);
  y -= 8;
  section("Participation & fee summary");
  const pass = r.hasPass ?? true;
  if (pass) {
    page.drawText(`Symposium Pass, all sessions${r.earlyBird ? " (early-bird)" : ""} - includes 1 banquet pass`, { x: 40, y, size: 10, font: f, color: INK });
    page.drawText(pkr(r.conferenceFee), { x: W - 40 - b.widthOfTextAtSize(pkr(r.conferenceFee), 10), y, size: 10, font: b, color: INK }); y -= 17;
  }
  if (r.banquetQty) {
    page.drawText(`Extra banquet pass x ${r.banquetQty}`, { x: 40, y, size: 10, font: f, color: INK });
    page.drawText(pkr(r.banquetFee ?? 0), { x: W - 40 - b.widthOfTextAtSize(pkr(r.banquetFee ?? 0), 10), y, size: 10, font: b, color: INK }); y -= 17;
  }
  for (const it of r.items) {
    const line = `Workshop ticket: ${it.session.title}`;
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
  page.drawText(safe(`Find your tickets: ${appUrl()}/my-registrations`), { x: 40, y: 28, size: 8, font: f, color: GREY });
  if (!awaiting && (r.hasPass ?? true)) { await idCardPage(doc, r, ev, f, b); await idCardBack(doc, f, b); }
  // one page per workshop ticket, each with its own QR (release 3, D4)
  if (!awaiting) for (const it of [...r.items].sort((x, z) => +x.session.startsAt - +z.session.startsAt)) await ticketPage(doc, r, it, f, b);
  return doc.save();
}

/** Participant registration ID card (4 x 6 in): check-in QR + separate QR codes for the Scientific Agenda and the e-abstract book (SC feedback). */
async function idCardPage(doc: PDFDocument, r: RegForPdf, ev: { name: string }, f: PDFFont, b: PDFFont) {
  const W = 288, H = 432;
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: H - 92, width: W, height: 92, color: NAVY });
  p.drawRectangle({ x: 0, y: H - 96, width: W, height: 4, color: RED });
  const c = (t: string, y: number, size: number, font: PDFFont, color = INK) => p.drawText(t, { x: (W - font.widthOfTextAtSize(t, size)) / 2, y, size, font, color });
  c("LIAQUAT NATIONAL HOSPITAL", H - 28, 8, b, rgb(0.75, 0.82, 1));
  c(safe(ev.name), H - 50, 14, b, rgb(1, 1, 1));
  c("29, 30 & 31 January 2027", H - 68, 9, f, rgb(0.85, 0.9, 1));
  const role = r.regType === "GUEST" ? (r.guestRole ?? "GUEST").replace("_", " ") : r.regType === "VOLUNTEER" ? "VOLUNTEER" : "DELEGATE";
  const tag = role.toUpperCase();
  const tw = b.widthOfTextAtSize(tag, 9) + 18;
  p.drawRectangle({ x: (W - tw) / 2, y: H - 124, width: tw, height: 18, color: r.regType === "PARTICIPANT" || !r.regType ? BLUE : RED });
  c(tag, H - 118, 9, b, rgb(1, 1, 1));
  const name = safe(`${r.title} ${r.firstName} ${r.lastName}`);
  const ns = b.widthOfTextAtSize(name, 18) > W - 30 ? 14 : 18;
  c(name, H - 150, ns, b);
  c(safe(r.institution).slice(0, 48), H - 166, 9, f, GREY);
  c(r.regNo, H - 184, 11, b, BLUE);
  const main = await qrPng(doc, qrPayload(r));
  p.drawImage(main, { x: (W - 118) / 2, y: 126, width: 118, height: 118 });
  c("Check-in", 116, 7, f, GREY);
  const qa = await qrPng(doc, `${appUrl()}/agenda`), qb = await qrPng(doc, `${appUrl()}/abstracts/book`);
  p.drawImage(qa, { x: 34, y: 30, width: 72, height: 72 });
  p.drawImage(qb, { x: W - 34 - 72, y: 30, width: 72, height: 72 });
  p.drawText("Scientific Agenda", { x: 70 - b.widthOfTextAtSize("Scientific Agenda", 7.5) / 2, y: 20, size: 7.5, font: b, color: NAVY });
  p.drawText("e-Abstract book", { x: W - 70 - b.widthOfTextAtSize("e-Abstract book", 7.5) / 2, y: 20, size: 7.5, font: b, color: NAVY });
  p.drawLine({ start: { x: 20, y: 110 }, end: { x: W - 20, y: 110 }, thickness: 0.4, color: rgb(0.85, 0.88, 0.94) });
  const bq = ((r.hasPass ?? true) && (r.regType ?? "PARTICIPANT") === "PARTICIPANT" ? 1 : 0) + (r.banquetQty ?? 0);
  c((r.hasPass ?? true) ? `Symposium Pass${bq ? `  |  Banquet x ${bq}` : ""}` : "Workshop ticket(s) only", 6, 7, b, RED);
}

/** Back of the ID card (4 x 6 in): the session feedback QR (Dashboard Instructions, revised 06-11-2026:
 *  "Remove Feedback QR code from dashboard, it will be added on the back of the attendee's registration ID card"). */
async function idCardBack(doc: PDFDocument, f: PDFFont, b: PDFFont) {
  const W = 288, H = 432;
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: NAVY });
  p.drawRectangle({ x: 0, y: H - 74, width: W, height: 4, color: RED });
  const c = (t: string, y: number, size: number, font: PDFFont, color = INK) => p.drawText(t, { x: (W - font.widthOfTextAtSize(t, size)) / 2, y, size, font, color });
  c("ID CARD - BACK", H - 30, 9, b, rgb(0.75, 0.82, 1));
  c("Your feedback matters", H - 52, 13, b, rgb(1, 1, 1));
  const q = await qrPng(doc, `${appUrl()}/feedback`);
  p.drawImage(q, { x: (W - 160) / 2, y: 150, width: 160, height: 160 });
  c("Session feedback", 132, 11, b, NAVY);
  c("Scan to rate the sessions and workshops", 114, 8.5, f, GREY);
  c("you attended. It takes under a minute.", 102, 8.5, f, GREY);
  c(safe(`${appUrl().replace(/^https?:\/\//, "")}/feedback`), 70, 8, f, BLUE);
  c("Please wear your ID card at all times on campus.", 28, 7.5, f, GREY);
}

/** Workshop ticket (4 x 6 in): one per workshop, with the ticket's own QR for that workshop's door. */
async function ticketPage(doc: PDFDocument, r: RegForPdf, it: RegForPdf["items"][number], f: PDFFont, b: PDFFont) {
  const W = 288, H = 432, GOLD = rgb(0.76, 0.52, 0.08);
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: NAVY });
  p.drawRectangle({ x: 0, y: H - 74, width: W, height: 4, color: GOLD });
  const c = (t: string, y: number, size: number, font: PDFFont, color = INK) => p.drawText(t, { x: (W - font.widthOfTextAtSize(t, size)) / 2, y, size, font, color });
  c("WORKSHOP TICKET", H - 30, 11, b, rgb(1, 1, 1));
  c("Separate from the Symposium Pass", H - 48, 8, f, rgb(0.85, 0.9, 1));
  let y = H - 100;
  for (const line of wrap(safe(it.session.title), b, 13, W - 36).slice(0, 3)) { c(line, y, 13, b); y -= 17; }
  c(safe(`${fmtDate(it.session.startsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}, ${fmtTime(it.session.startsAt)}-${fmtTime(it.session.endsAt)}`), y - 2, 9, f, GREY); y -= 15;
  if (it.session.hall) c(safe(it.session.hall).slice(0, 52), y - 2, 9, f, GREY);
  const q = await qrPng(doc, ticketPayload(r as any, it));
  p.drawImage(q, { x: (W - 140) / 2, y: 92, width: 140, height: 140 });
  c("Show at the workshop door", 80, 7, f, GREY);
  c(safe(`${r.title} ${r.firstName} ${r.lastName}`).slice(0, 40), 54, 12, b);
  c(it.ticketNo ?? r.regNo, 36, 10, b, BLUE);
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


// ---------- Flyer template (9th LNH Symposium poster; Marketing spec, 30 Oct 2026) ----------
// DM Sans, 1080 x 1350 (social media portrait, also the base for workshop standees). Fonts are embedded in full (not subset)
// so every text line stays editable in Acrobat / Illustrator / Canva. Colours: navy #232667, red #B72025, cyan #00B8D7 → blue #0089BF.
const FLYER_DIR = path.join(process.cwd(), "assets", "flyer");
let flyerAssets: Promise<Record<string, Buffer>> | null = null;
const FLYER_FILES = ["DMSans_300Light.ttf", "DMSans_400Regular.ttf", "DMSans_500Medium.ttf", "DMSans_700Bold.ttf", "lnh-logo.png", "campus-scene.png", "symposium-title.pdf"];
const loadFlyerAssets = () => (flyerAssets ??= (async () => {
  const files = await Promise.all(FLYER_FILES.map((n) => readFile(path.join(FLYER_DIR, n))));
  return Object.fromEntries(FLYER_FILES.map((n, i) => [n, files[i]]));
})().catch((e) => { flyerAssets = null; throw e; }));

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const clean = (v: unknown) => String(v ?? "-").replace(/[\u0000-\u001f]/g, " ");

export type FlyerInput = {
  slug: string; title: string; description: string | null; department: string | null; format: string | null; startsAt: Date; endsAt: Date;
  hall: string | null; building?: string | null; capacity: number | null; left: number | null; fee: number; earlyFee: number | null; cmeHours: number | null;
  leadFaculty: string | null; facultyDegrees: string | null; themeLabel?: string | null; category: string | null;
};
type FlyerEvent = { name: string; mainTheme: string; contactEmail: string; contactPhone: string; startDate?: Date; endDate?: Date; eventDays?: string[] };
type Fact = [label: string, value: string, sub?: string];
type PosterSpec = {
  docTitle: string; tag: string; tagColor: string; meta: string; title: string; subtitle?: string | null; facts: Fact[];
  people: { label: string; name: string; note?: string | null }[]; lines?: string[]; description?: string | null;
  qrUrl: string; qrTitle: string; qrSub: string; footerPath: string;
};

async function posterFlyer(spec: PosterSpec, ev: FlyerEvent) {
  const A = await loadFlyerAssets();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(spec.docTitle); doc.setAuthor("Liaquat National Hospital"); doc.setSubject(ev.name); doc.setCreator("9th LNH Symposium portal");
  const W = 1080, H = 1350;
  const page = doc.addPage([W, H]);
  const [light, reg, med, bold] = await Promise.all(["DMSans_300Light.ttf", "DMSans_400Regular.ttf", "DMSans_500Medium.ttf", "DMSans_700Bold.ttf"].map((f) => doc.embedFont(A[f], { subset: false })));
  const NAVYT = hex("#232667"), MUTED = hex("#4B5B76"), BLUET = hex("#0089BF"), CYAN = hex("#00B8D7"), WHITE = rgb(1, 1, 1);

  // background: the poster's white-to-sky gradient
  const stops: [number, number[]][] = [[0, [251, 253, 252]], [0.42, [249, 251, 251]], [0.6, [238, 244, 248]], [0.82, [178, 209, 228]], [1, [151, 193, 218]]];
  const colAt = (t: number) => { let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++; const [t0, c0] = stops[i], [t1, c1] = stops[i + 1]; const k = (t - t0) / (t1 - t0); return rgb(...(c0.map((c, j) => (c + (c1[j] - c) * k) / 255) as [number, number, number])); };
  const bands = 160;
  for (let i = 0; i < bands; i++) page.drawRectangle({ x: 0, y: H - (i + 1) * (H / bands), width: W, height: H / bands + 0.8, color: colAt(i / (bands - 1)) });

  const center = (text: string, y: number, size: number, font: PDFFont, color = NAVYT) => page.drawText(text, { x: (W - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });

  // header: logo, symposium title (official gradient artwork), dates, theme
  const logo = await doc.embedPng(A["lnh-logo.png"]);
  const lw = 560, lh = lw * logo.height / logo.width, ly = H - 54 - lh;
  page.drawImage(logo, { x: (W - lw) / 2, y: ly, width: lw, height: lh });
  const [titleArt] = await doc.embedPdf(A["symposium-title.pdf"]);
  const tw = 540, th = tw * titleArt.height / titleArt.width, ty = ly - 30 - th;
  page.drawPage(titleArt, { x: (W - tw) / 2, y: ty, width: tw, height: th });

  const days = (ev.eventDays?.length ? ev.eventDays : ["2027-01-29", "2027-01-30", "2027-01-31"]).map((d) => new Date(`${d}T12:00:00+05:00`));
  const ord = (n: number) => (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th");
  const parts: [string, boolean][] = [];
  days.forEach((d, i) => { const n = d.getUTCDate(); parts.push([String(n), false], [ord(n), true], [i === days.length - 1 ? ", " : i === days.length - 2 ? " & " : ", ", false]); });
  parts.push([`${fmtDate(days.at(-1)!, { month: "long" })} ${fmtDate(days.at(-1)!, { year: "numeric" })}`, false]);
  const DS = 27, SS = 15, dy = ty - 44;
  const dw = parts.reduce((a, [t, sup]) => a + reg.widthOfTextAtSize(t, sup ? SS : DS), 0);
  let dx = (W - dw) / 2;
  for (const [t, sup] of parts) { page.drawText(t, { x: dx, y: sup ? dy + 11 : dy, size: sup ? SS : DS, font: reg, color: NAVYT }); dx += reg.widthOfTextAtSize(t, sup ? SS : DS); }

  const [themeA, themeB] = ev.mainTheme.includes(":") ? ev.mainTheme.split(/:\s*/) : [ev.mainTheme, ""];
  const conv = themeB.match(/^(Convergence of)\s+(.*)$/i);
  center(clean(conv ? `${themeA}: ${conv[1]}` : themeA + (themeB ? ":" : "")), dy - 44, 21, light);
  const caps = clean(conv ? conv[2] : themeB).toUpperCase();
  const capsSize = 22, track = 2.2, capsW = [...caps].reduce((a, c) => a + med.widthOfTextAtSize(c, capsSize) + track, -track);
  let cxs = (W - capsW) / 2;
  for (const c of caps) { page.drawText(c, { x: cxs, y: dy - 78, size: capsSize, font: med, color: NAVYT }); cxs += med.widthOfTextAtSize(c, capsSize) + track; }

  // campus scene (building, robotics and digital health) as on the poster, behind the card's lower edge
  const scene = await doc.embedPng(A["campus-scene.png"]);
  const sw = 860, sh = sw * scene.height / scene.width;
  page.drawImage(scene, { x: (W - sw) / 2 + 10, y: 44, width: sw, height: sh });

  // card
  const cx = 60, cw = W - 120, cTop = dy - 112, cBot = 44 + sh - 30, r = 26;
  const chh = cTop - cBot;
  page.drawSvgPath(`M ${r} 0 H ${cw - r} Q ${cw} 0 ${cw} ${r} V ${chh - r} Q ${cw} ${chh} ${cw - r} ${chh} H ${r} Q 0 ${chh} 0 ${chh - r} V ${r} Q 0 0 ${r} 0 Z`,
    { x: cx, y: cTop, color: WHITE, opacity: 0.93, borderColor: hex("#BCD6EA"), borderWidth: 1.2 });

  let y = cTop - 52;
  const tagW = bold.widthOfTextAtSize(spec.tag, 14) + 34;
  page.drawSvgPath(`M 16 0 H ${tagW - 16} Q ${tagW} 0 ${tagW} 16 Q ${tagW} 32 ${tagW - 16} 32 H 16 Q 0 32 0 16 Q 0 0 16 0 Z`, { x: cx + 40, y: y + 23, color: hex(spec.tagColor) });
  page.drawText(spec.tag, { x: cx + 57, y: y + 2, size: 14, font: bold, color: WHITE });
  page.drawText(clean(spec.meta).toUpperCase().slice(0, 60), { x: cx + 40 + tagW + 16, y: y + 2, size: 13.5, font: med, color: BLUET });

  const L = cx + 40, colW = 600, qrW = 250;
  y -= 56;
  for (const line of wrap(clean(spec.title), bold, 40, colW).slice(0, 3)) { page.drawText(line, { x: L, y, size: 40, font: bold, color: NAVYT }); y -= 46; }
  if (spec.subtitle) { page.drawText(clean(spec.subtitle).slice(0, 70), { x: L, y: y + 8, size: 15, font: med, color: BLUET }); y -= 22; }

  // facts: up to 2 rows x 3 columns
  y -= 18;
  const fact = (x: number, fy: number, [label, value, sub]: Fact) => {
    page.drawText(label.toUpperCase(), { x, y: fy, size: 12.5, font: med, color: BLUET });
    page.drawText(clean(value).slice(0, 26), { x, y: fy - 26, size: 20, font: bold, color: NAVYT });
    if (sub) page.drawText(clean(sub).slice(0, 34), { x, y: fy - 46, size: 13, font: reg, color: MUTED });
  };
  spec.facts.slice(0, 6).forEach((f, i) => fact(L + (i % 3) * 205, y - Math.floor(i / 3) * 78, f));
  y -= spec.facts.length > 3 ? 160 : 82;
  page.drawLine({ start: { x: L, y: y + 20 }, end: { x: L + colW, y: y + 20 }, thickness: 1, color: hex("#D5E3EF") });

  for (const p of spec.people) {
    if (y < cBot + 70) break;
    page.drawText(p.label.toUpperCase(), { x: L, y, size: 12.5, font: med, color: BLUET });
    page.drawText(clean(p.name).slice(0, 44), { x: L + 170, y, size: 18, font: bold, color: NAVYT });
    if (p.note) page.drawText(clean(p.note).slice(0, 40), { x: L + 170 + bold.widthOfTextAtSize(clean(p.name).slice(0, 44), 18) + 10, y: y + 1, size: 13, font: reg, color: MUTED });
    y -= 30;
  }
  const extra = [...(spec.lines ?? []), ...(spec.description ? wrap(clean(spec.description), reg, 15, colW) : [])];
  const maxLines = Math.max(0, Math.floor((y - (cBot + 30)) / 21));
  extra.slice(0, maxLines).forEach((line, i) => page.drawText(i === maxLines - 1 && extra.length > maxLines ? line.replace(/\s*\S*$/, " ...") : line, { x: L, y: y - 4 - i * 21, size: 15, font: reg, color: MUTED }));

  // QR panel
  const qr = await qrPng(doc, spec.qrUrl);
  const qx = cx + cw - 40 - qrW, qh = 300, qy = cTop - 70 - qh;
  page.drawSvgPath(`M 22 0 H ${qrW - 22} Q ${qrW} 0 ${qrW} 22 V ${qh - 22} Q ${qrW} ${qh} ${qrW - 22} ${qh} H 22 Q 0 ${qh} 0 ${qh - 22} V 22 Q 0 0 22 0 Z`, { x: qx, y: qy + qh, color: hex("#EEF5FB"), borderColor: hex("#BCD6EA"), borderWidth: 1 });
  page.drawImage(qr, { x: qx + 30, y: qy + 68, width: qrW - 60, height: qrW - 60 });
  page.drawText(spec.qrTitle, { x: qx + qrW / 2 - bold.widthOfTextAtSize(spec.qrTitle, 14) / 2, y: qy + 38, size: 14, font: bold, color: NAVYT });
  page.drawText(spec.qrSub, { x: qx + qrW / 2 - reg.widthOfTextAtSize(spec.qrSub, 12.5) / 2, y: qy + 18, size: 12.5, font: reg, color: MUTED });
  page.drawRectangle({ x: qx + 30, y: qy - 14, width: qrW - 60, height: 4, color: CYAN });

  // footer line
  center(clean(`${ev.contactEmail}   |   ${ev.contactPhone}   |   ${appUrl().replace(/^https?:\/\//, "")}${spec.footerPath}`), 16, 15, med, NAVYT);
  return doc.save();
}

/** Flyer generated from an approved workshop record on the official 9th LNH Symposium poster design (1080 x 1350, DM Sans). */
export async function workshopFlyerPdf(w: FlyerInput, ev: FlyerEvent) {
  return posterFlyer({
    docTitle: `${w.title} - flyer`, tag: "PRE-SYMPOSIUM WORKSHOP", tagColor: "#B72025",
    meta: [w.department, w.format, w.category === "A" ? "Multidisciplinary" : null].filter(Boolean).join("  ·  "),
    title: w.title, subtitle: w.themeLabel,
    facts: [
      ["Date", fmtDate(w.startsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })],
      ["Time", `${fmtTime24(w.startsAt)} - ${fmtTime24(w.endsAt)}`, "Pakistan time"],
      ["Venue", w.hall ?? "-", w.building ?? undefined],
      ["CME", w.cmeHours != null ? `${w.cmeHours} contact hours` : "-"],
      ["Fee", pkr(w.fee), "Separate ticket, no Symposium Pass needed"],
      ["Seats", w.capacity != null ? `${w.capacity} only` : "Open", w.left != null ? `${w.left} left at print time` : undefined],
    ],
    people: w.leadFaculty ? [{ label: "Lead faculty", name: w.leadFaculty, note: w.facultyDegrees }] : [],
    description: w.description,
    qrUrl: `${appUrl()}/workshops#${w.slug}`, qrTitle: "SCAN TO REGISTER", qrSub: "Limited seats", footerPath: "/workshops",
  }, ev);
}

export type SessionFlyerInput = {
  slug: string; title: string; department: string | null; formatLabel: string | null; startsAt: Date; endsAt: Date; hall: string | null; building?: string | null;
  expectedAudience: number | null; people: { role: string; name: string; topic?: string | null; designation?: string | null }[];
};

/** Scientific session flyer (SC feedback, 29 Oct 2026): generated from the approved session content, then approved by the HOD and locked. */
export async function sessionFlyerPdf(x: SessionFlyerInput, ev: FlyerEvent) {
  const one = (r: string) => x.people.find((p) => p.role === r);
  const lead = [["CHAIR", "Chairperson"], ["CO_CHAIR", "Co-Chairperson"], ["MODERATOR", "Moderator"]].map(([r, l]) => ({ p: one(r), l })).filter((z) => z.p)
    .map(({ p, l }) => ({ label: l, name: p!.name, note: p!.designation }));
  const talks = x.people.filter((p) => ["KEYNOTE", "SPEAKER", "PANELIST", "PRESENTER"].includes(p.role))
    .map((p) => `${p.role === "KEYNOTE" ? "Keynote: " : p.role === "PANELIST" ? "Panelist: " : ""}${p.name}${p.topic ? ` - ${p.topic}` : ""}`);
  return posterFlyer({
    docTitle: `${x.title} - session flyer`, tag: "SCIENTIFIC SESSION", tagColor: "#232667",
    meta: [x.department, x.formatLabel].filter(Boolean).join("  ·  "), title: x.title,
    facts: [
      ["Date", fmtDate(x.startsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })],
      ["Time", `${fmtTime24(x.startsAt)} - ${fmtTime24(x.endsAt)}`, "Pakistan time"],
      ["Venue", x.hall ?? "To be announced", x.building ?? undefined],
    ],
    people: lead, lines: talks,
    qrUrl: `${appUrl()}/agenda`, qrTitle: "SCAN FOR THE AGENDA", qrSub: "Scientific programme", footerPath: "/agenda",
  }, ev);
}
