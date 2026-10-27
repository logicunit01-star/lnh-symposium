import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fmtDate, fmtDateTime, fmtTime, fmtTime24, pkr, appUrl } from "./utils";
import { qrPayload } from "./qr-payload";

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


// ---------- Flyer template (9th LNH Symposium poster, Oct 2026) ----------
const FLYER_DIR = path.join(process.cwd(), "assets", "flyer");
let flyerAssets: Promise<Record<string, Buffer>> | null = null;
const loadFlyerAssets = () => (flyerAssets ??= (async () => {
  const names = ["Poppins-Light.ttf", "Poppins-Regular.ttf", "Poppins-Medium.ttf", "Poppins-Bold.ttf", "lnh-logo.png", "campus-scene.png", "symposium-title.pdf"];
  const files = await Promise.all(names.map((n) => readFile(path.join(FLYER_DIR, n))));
  return Object.fromEntries(names.map((n, i) => [n, files[i]]));
})().catch((e) => { flyerAssets = null; throw e; }));

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const clean = (v: unknown) => String(v ?? "-").replace(/[\u0000-\u001f]/g, " ");

export type FlyerInput = {
  slug: string; title: string; description: string | null; department: string | null; format: string | null; startsAt: Date; endsAt: Date;
  hall: string | null; building?: string | null; capacity: number | null; left: number | null; fee: number; earlyFee: number | null; cmeHours: number | null;
  leadFaculty: string | null; facultyDegrees: string | null; themeLabel?: string | null; category: string | null;
};

/** A4 flyer generated from an approved workshop record, on the official 9th LNH Symposium poster design. */
export async function workshopFlyerPdf(w: FlyerInput, ev: { name: string; mainTheme: string; contactEmail: string; contactPhone: string; startDate?: Date; endDate?: Date; eventDays?: string[] }) {
  const A = await loadFlyerAssets();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`${w.title} - flyer`); doc.setAuthor("Liaquat National Hospital"); doc.setSubject(ev.name);
  const page = doc.addPage([595, 842]);
  const W = 595, H = 842;
  const [light, reg, med, bold] = await Promise.all(["Poppins-Light.ttf", "Poppins-Regular.ttf", "Poppins-Medium.ttf", "Poppins-Bold.ttf"].map((f) => doc.embedFont(A[f], { subset: true })));
  const NAVYT = hex("#0A1B3D"), MUTED = hex("#4B5B76"), SKYT = hex("#0B84C6"), REDT = hex("#D2192E"), WHITE = rgb(1, 1, 1);

  // background: the poster's white-to-sky gradient
  const stops: [number, number[]][] = [[0, [251, 253, 252]], [0.42, [249, 251, 251]], [0.6, [238, 244, 248]], [0.82, [178, 209, 228]], [1, [151, 193, 218]]];
  const colAt = (t: number) => { let i = 0; while (i < stops.length - 2 && t > stops[i + 1][0]) i++; const [t0, c0] = stops[i], [t1, c1] = stops[i + 1]; const k = (t - t0) / (t1 - t0); return rgb(...(c0.map((c, j) => (c + (c1[j] - c) * k) / 255) as [number, number, number])); };
  const bands = 140;
  for (let i = 0; i < bands; i++) page.drawRectangle({ x: 0, y: H - (i + 1) * (H / bands), width: W, height: H / bands + 0.6, color: colAt(i / (bands - 1)) });

  const center = (text: string, y: number, size: number, font: PDFFont, color = NAVYT) => page.drawText(text, { x: (W - font.widthOfTextAtSize(text, size)) / 2, y, size, font, color });
  const spaced = (text: string, y: number, size: number, font: PDFFont, track: number, color = NAVYT) => {
    const width = [...text].reduce((a, c) => a + font.widthOfTextAtSize(c, size) + track, -track);
    let x = (W - width) / 2;
    for (const c of text) { page.drawText(c, { x, y, size, font, color }); x += font.widthOfTextAtSize(c, size) + track; }
  };

  // header: logo, symposium title, dates, theme
  const logo = await doc.embedPng(A["lnh-logo.png"]);
  const lw = 300, lh = lw * logo.height / logo.width;
  page.drawImage(logo, { x: (W - lw) / 2, y: H - 34 - lh, width: lw, height: lh });
  const [titleArt] = await doc.embedPdf(A["symposium-title.pdf"]);
  const tw = 296, th = tw * titleArt.height / titleArt.width;
  page.drawPage(titleArt, { x: (W - tw) / 2, y: 700, width: tw, height: th });

  // "29th, 30th & 31st, January 2027" with superscript ordinals, from the event days
  const days = (ev.eventDays?.length ? ev.eventDays : ["2027-01-29", "2027-01-30", "2027-01-31"]).map((d) => new Date(`${d}T12:00:00+05:00`));
  const ord = (n: number) => (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th");
  const parts: [string, boolean][] = [];
  days.forEach((d, i) => { const n = d.getUTCDate(); parts.push([String(n), false], [ord(n), true], [i === days.length - 1 ? ", " : i === days.length - 2 ? " & " : ", ", false]); });
  parts.push([`${fmtDate(days.at(-1)!, { month: "long" })} ${fmtDate(days.at(-1)!, { year: "numeric" })}`, false]);
  const DS = 14, SS = 8;
  const dw = parts.reduce((a, [t, sup]) => a + reg.widthOfTextAtSize(t, sup ? SS : DS), 0);
  let dx = (W - dw) / 2;
  for (const [t, sup] of parts) { page.drawText(t, { x: dx, y: sup ? 678 : 672, size: sup ? SS : DS, font: reg, color: NAVYT }); dx += reg.widthOfTextAtSize(t, sup ? SS : DS); }

  const [themeA, themeB] = ev.mainTheme.includes(":") ? ev.mainTheme.split(/:\s*/) : [ev.mainTheme, ""];
  const conv = themeB.match(/^(Convergence of)\s+(.*)$/i);
  center(clean(conv ? `${themeA}: ${conv[1]}` : themeA + (themeB ? ":" : "")), 646, 11.5, light);
  spaced(clean(conv ? conv[2] : themeB).toUpperCase(), 628, 12, med, 1.2);

  // workshop card
  const cx = 38, cw = W - 76, cTop = 604, cBot = 300;
  const r = 16;
  const card = `M ${r} 0 H ${cw - r} Q ${cw} 0 ${cw} ${r} V ${cTop - cBot - r} Q ${cw} ${cTop - cBot} ${cw - r} ${cTop - cBot} H ${r} Q 0 ${cTop - cBot} 0 ${cTop - cBot - r} V ${r} Q 0 0 ${r} 0 Z`;
  page.drawSvgPath(card, { x: cx, y: cTop, color: WHITE, opacity: 0.9, borderColor: hex("#BCD6EA"), borderWidth: 0.8 });

  let y = cTop - 30;
  const tag = "PRE-SYMPOSIUM WORKSHOP";
  const tagW = bold.widthOfTextAtSize(tag, 7.5) + 18;
  page.drawSvgPath(`M 9 0 H ${tagW - 9} Q ${tagW} 0 ${tagW} 9 Q ${tagW} 18 ${tagW - 9} 18 H 9 Q 0 18 0 9 Q 0 0 9 0 Z`, { x: cx + 22, y: y + 13, color: REDT });
  page.drawText(tag, { x: cx + 31, y: y + 1, size: 7.5, font: bold, color: WHITE });
  const meta = clean([w.department, w.format, w.category === "A" ? "Multidisciplinary" : null].filter(Boolean).join("  ·  "));
  page.drawText(meta.toUpperCase(), { x: cx + 22 + tagW + 10, y: y + 1, size: 7.5, font: med, color: SKYT });

  const L = cx + 22, colW = 330;
  y -= 30;
  for (const line of wrap(clean(w.title), bold, 19, colW).slice(0, 3)) { page.drawText(line, { x: L, y, size: 19, font: bold, color: NAVYT }); y -= 23; }
  if (w.themeLabel) { page.drawText(clean(w.themeLabel), { x: L, y: y + 4, size: 8, font: med, color: SKYT }); y -= 12; }

  // facts: 2 rows x 3 columns
  y -= 12;
  const fact = (x: number, fy: number, label: string, value: string, sub?: string) => {
    page.drawText(label.toUpperCase(), { x, y: fy, size: 6.8, font: med, color: SKYT });
    page.drawText(clean(value).slice(0, 30), { x, y: fy - 14, size: 10.5, font: bold, color: NAVYT });
    if (sub) page.drawText(clean(sub).slice(0, 38), { x, y: fy - 25, size: 7, font: reg, color: MUTED });
  };
  fact(L, y, "Date", fmtDate(w.startsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" }));
  fact(L + 115, y, "Time", `${fmtTime24(w.startsAt)} - ${fmtTime24(w.endsAt)}`, "Pakistan time");
  fact(L + 225, y, "Venue", w.hall ?? "-", w.building ?? undefined);
  y -= 42;
  fact(L, y, "CME", w.cmeHours != null ? `${w.cmeHours} contact hours` : "-");
  fact(L + 115, y, "Fee", pkr(w.fee), w.earlyFee != null && w.earlyFee < w.fee ? `Early bird ${pkr(w.earlyFee)}` : undefined);
  fact(L + 225, y, "Seats", w.capacity != null ? `${w.capacity} only` : "Open", w.left != null ? `${w.left} left at print time` : undefined);
  y -= 44;
  page.drawLine({ start: { x: L, y: y + 12 }, end: { x: L + colW, y: y + 12 }, thickness: 0.5, color: hex("#D5E3EF") });
  if (w.leadFaculty) {
    page.drawText("LEAD FACULTY", { x: L, y, size: 6.8, font: med, color: SKYT }); y -= 14;
    page.drawText(clean(w.leadFaculty).slice(0, 48), { x: L, y, size: 11, font: bold, color: NAVYT });
    if (w.facultyDegrees) page.drawText(clean(w.facultyDegrees).slice(0, 40), { x: L + bold.widthOfTextAtSize(clean(w.leadFaculty).slice(0, 48), 11) + 6, y: y + 0.5, size: 8, font: reg, color: MUTED });
    y -= 16;
  }
  if (w.description) {
    const maxLines = Math.max(0, Math.floor((y - (cBot + 14)) / 11));
    const lines = wrap(clean(w.description), reg, 8.2, colW);
    lines.slice(0, maxLines).forEach((line, i) => page.drawText(i === maxLines - 1 && lines.length > maxLines ? line.replace(/\s*\S*$/, " ...") : line, { x: L, y: y - i * 11, size: 8.2, font: reg, color: MUTED }));
  }

  // QR panel
  const url = `${appUrl()}/workshops#${w.slug}`;
  const qr = await qrPng(doc, url);
  const qx = cx + cw - 22 - 130, qy = cTop - 214;
  page.drawSvgPath(`M 12 0 H 118 Q 130 0 130 12 V 152 Q 130 164 118 164 H 12 Q 0 164 0 152 V 12 Q 0 0 12 0 Z`, { x: qx, y: qy + 164, color: hex("#EEF5FB"), borderColor: hex("#BCD6EA"), borderWidth: 0.6 });
  page.drawImage(qr, { x: qx + 15, y: qy + 34, width: 100, height: 100 });
  const scan = "SCAN TO REGISTER";
  page.drawText(scan, { x: qx + 65 - bold.widthOfTextAtSize(scan, 7.5) / 2, y: qy + 18, size: 7.5, font: bold, color: NAVYT });
  const reg2 = "Limited seats";
  page.drawText(reg2, { x: qx + 65 - reg.widthOfTextAtSize(reg2, 7) / 2, y: qy + 8, size: 7, font: reg, color: MUTED });

  // campus scene (building, robotics and digital health) as on the poster
  const scene = await doc.embedPng(A["campus-scene.png"]);
  const sw = 520, sh = sw * scene.height / scene.width;
  page.drawImage(scene, { x: (W - sw) / 2 + 6, y: 46, width: sw, height: sh });

  // footer line
  const foot = clean(`${ev.contactEmail}   |   ${ev.contactPhone}   |   ${appUrl().replace(/^https?:\/\//, "")}/workshops`);
  center(foot, 22, 8, med, NAVYT);
  return doc.save();
}
