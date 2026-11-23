import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { WpRow } from "./wp";
import { CATEGORY_LABEL, DECISION_LABEL } from "./wp";
import { fmtDate, fmtDateTime, pkr } from "./utils";

/**
 * Workshop details as PDF for the Workshop Programme Chair (LNH, 23 Nov 2026):
 * - workshopsListPdf: every workshop in the console's current filter, one row each (A4 landscape)
 * - workshopDetailPdf: one workshop's full request (A4 portrait)
 */
const NAVY = rgb(0x23 / 255, 0x26 / 255, 0x67 / 255);
const RED = rgb(0xb7 / 255, 0x20 / 255, 0x25 / 255);
const GREY = rgb(0.36, 0.42, 0.55);
const INK = rgb(0.06, 0.09, 0.2);
const LINE = rgb(0.85, 0.87, 0.92);
const SHADE = rgb(0.95, 0.96, 0.98);

const safe = (s: unknown) => String(s ?? "").replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/[^\x20-\x7E\xA0-\xFF\n]/g, ""); // Helvetica (WinAnsi) covers Latin-1
function wrap(text: string, font: PDFFont, size: number, max: number) {
  const out: string[] = [];
  for (const para of safe(text).split("\n")) {
    let cur = "";
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const t = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > max && cur) { out.push(cur); cur = w; } else cur = t;
      while (font.widthOfTextAtSize(cur, size) > max && cur.length > 1) { // a very long word
        let k = cur.length; while (k > 1 && font.widthOfTextAtSize(cur.slice(0, k), size) > max) k--;
        out.push(cur.slice(0, k)); cur = cur.slice(k);
      }
    }
    out.push(cur);
  }
  return out;
}
const dateText = (r: WpRow) => r.w.days > 1
  ? `${fmtDate(r.w.startsAt, { weekday: "short", day: "numeric", month: "short" })} - ${fmtDate(r.w.endsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`
  : fmtDate(r.w.startsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const venueText = (r: WpRow) => r.w.mode === "ONLINE" ? "Online" : r.venue ? `${r.venue.name}, ${r.venue.building}` : r.w.hall ?? "";
const statusText = (r: WpRow) => `${r.w.status.replace("_", " ")}${r.w.coChairDecision ? ` (${DECISION_LABEL[r.w.coChairDecision]})` : ""}`;

type Ctx = { doc: PDFDocument; reg: PDFFont; bold: PDFFont; W: number; H: number; M: number; page: PDFPage; y: number; title: string; sub: string };
function header(c: Ctx) {
  const { page, W, H, M } = c;
  page.drawRectangle({ x: 0, y: H - 54, width: W, height: 54, color: NAVY });
  page.drawRectangle({ x: 0, y: H - 57, width: W, height: 3, color: RED });
  page.drawText(safe(c.title), { x: M, y: H - 30, size: 15, font: c.bold, color: rgb(1, 1, 1) });
  page.drawText(safe(c.sub), { x: M, y: H - 45, size: 8.5, font: c.reg, color: rgb(0.8, 0.85, 0.95) });
  c.y = H - 78;
}
function newPage(c: Ctx) { c.page = c.doc.addPage([c.W, c.H]); header(c); }
function footers(c: Ctx) {
  const pages = c.doc.getPages();
  pages.forEach((p, i) => p.drawText(safe(`Generated ${fmtDateTime(new Date())} · Page ${i + 1} of ${pages.length}`), { x: c.M, y: 18, size: 7.5, font: c.reg, color: GREY }));
}
async function start(size: [number, number], title: string, sub: string): Promise<Ctx> {
  const doc = await PDFDocument.create();
  doc.setTitle(title); doc.setProducer("9th LNH Symposium portal"); doc.setCreator("9th LNH Symposium portal");
  const c: Ctx = { doc, reg: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold), W: size[0], H: size[1], M: 32, page: null as unknown as PDFPage, y: 0, title, sub };
  newPage(c);
  return c;
}

/** All workshops in the current filter: one table row each. */
export async function workshopsListPdf(rows: WpRow[], o: { eventName: string; filter: string }) {
  const c = await start([842, 595], `${o.eventName}: pre-symposium workshops`, o.filter || "All workshops");
  const { M, W } = c;
  // totals
  const booked = rows.reduce((a, r) => a + r.booked, 0), paid = rows.reduce((a, r) => a + r.confirmed, 0), cap = rows.reduce((a, r) => a + (r.w.capacity ?? 0), 0), income = rows.reduce((a, r) => a + r.income, 0);
  const kpi: [string, string][] = [["Workshops", String(rows.length)], ["Approved", String(rows.filter((r) => r.w.status === "APPROVED").length)], ["Registered", `${booked} / ${cap}`], ["Paid", String(paid)], ["Income", pkr(income)]];
  const kw = (W - 2 * M) / kpi.length;
  kpi.forEach(([l, v], i) => {
    const x = M + i * kw;
    c.page.drawRectangle({ x, y: c.y - 34, width: kw - 8, height: 38, color: SHADE });
    c.page.drawText(safe(l.toUpperCase()), { x: x + 8, y: c.y - 9, size: 7, font: c.bold, color: GREY });
    c.page.drawText(safe(v), { x: x + 8, y: c.y - 26, size: 12, font: c.bold, color: INK });
  });
  c.y -= 52;
  const cols: { h: string; w: number; get: (r: WpRow, i: number) => string; bold?: boolean }[] = [
    { h: "#", w: 20, get: (_, i) => String(i + 1) },
    { h: "Workshop / department", w: 190, get: (r) => `${r.w.title}\n${r.w.department ?? ""}${r.w.category ? ` · ${CATEGORY_LABEL[r.w.category]}` : ""}`, bold: true },
    { h: "Date", w: 92, get: dateText },
    { h: "Time (24h)", w: 58, get: (r) => r.time.replace("–", "-") },
    { h: "Venue", w: 100, get: venueText },
    { h: "Workshop Director", w: 98, get: (r) => r.w.leadFaculty ?? "" },
    { h: "Reg / cap", w: 48, get: (r) => `${r.booked} / ${r.w.capacity ?? "-"}` },
    { h: "Paid", w: 30, get: (r) => String(r.confirmed) },
    { h: "Fee", w: 52, get: (r) => pkr(r.w.fee) },
    { h: "Status", w: 90, get: statusText },
  ];
  const scale = (W - 2 * M) / cols.reduce((a, x) => a + x.w, 0);
  cols.forEach((x) => (x.w *= scale));
  const head = () => {
    c.page.drawRectangle({ x: M, y: c.y - 16, width: W - 2 * M, height: 18, color: NAVY });
    let x = M; for (const col of cols) { c.page.drawText(col.h, { x: x + 4, y: c.y - 11, size: 7.5, font: c.bold, color: rgb(1, 1, 1) }); x += col.w; }
    c.y -= 20;
  };
  head();
  rows.forEach((r, i) => {
    const cells = cols.map((col, k) => {
      const text = col.get(r, i);
      if (!col.bold) return { lines: wrap(text, c.reg, 7.5, col.w - 8), nb: 0, k };
      const [first, ...rest] = text.split("\n"); // first line (the title) in bold, measured with the bold font
      const b = wrap(first, c.bold, 7.5, col.w - 8);
      return { lines: [...b, ...(rest.length ? wrap(rest.join("\n"), c.reg, 7.5, col.w - 8) : [])], nb: b.length, k };
    });
    const h = Math.max(...cells.map((x) => x.lines.length)) * 9.5 + 8;
    if (c.y - h < 34) { newPage(c); head(); }
    if (i % 2) c.page.drawRectangle({ x: M, y: c.y - h + 2, width: W - 2 * M, height: h, color: SHADE });
    let x = M;
    cells.forEach(({ lines, nb }, k) => {
      lines.forEach((ln, j) => c.page.drawText(ln, { x: x + 4, y: c.y - 9 - j * 9.5, size: 7.5, font: j < nb ? c.bold : c.reg, color: nb && j >= nb ? GREY : INK }));
      x += cols[k].w;
    });
    c.y -= h;
    c.page.drawLine({ start: { x: M, y: c.y + 2 }, end: { x: W - M, y: c.y + 2 }, thickness: 0.4, color: LINE });
  });
  if (!rows.length) c.page.drawText("No workshops match this filter.", { x: M, y: c.y - 14, size: 10, font: c.reg, color: GREY });
  footers(c);
  return c.doc.save();
}

/** One workshop: everything on its details page. */
export async function workshopDetailPdf(r: WpRow, o: { eventName: string; departments: string[]; weekLabel?: string | null }) {
  const { w } = r;
  const c = await start([595, 842], w.title.length > 60 ? `${w.title.slice(0, 58)}...` : w.title, `${o.eventName} · pre-symposium workshop · ${statusText(r)}`);
  const { M, W } = c, width = W - 2 * M;
  const need = (h: number) => { if (c.y - h < 40) newPage(c); };
  const heading = (t: string) => { need(30); c.y -= 8; c.page.drawText(safe(t).toUpperCase(), { x: M, y: c.y - 10, size: 9, font: c.bold, color: RED }); c.y -= 16; c.page.drawLine({ start: { x: M, y: c.y }, end: { x: W - M, y: c.y }, thickness: 0.6, color: LINE }); c.y -= 8; };
  const para = (t: string | null | undefined, size = 9.5) => {
    for (const ln of wrap(t || "-", c.reg, size, width)) { need(size + 4); c.page.drawText(ln, { x: M, y: c.y - size, size, font: c.reg, color: INK }); c.y -= size + 3.5; }
    c.y -= 4;
  };
  const grid = (items: [string, string | number | null | undefined][], cols = 3) => {
    const cw = width / cols;
    for (let i = 0; i < items.length; i += cols) {
      const row = items.slice(i, i + cols).map(([l, v]) => ({ l, lines: wrap(v === null || v === undefined || v === "" ? "-" : String(v), c.reg, 9.5, cw - 10) }));
      const h = 12 + Math.max(...row.map((x) => x.lines.length)) * 12.5 + 6;
      need(h);
      row.forEach(({ l, lines }, k) => {
        const x = M + k * cw;
        c.page.drawText(safe(l).toUpperCase(), { x, y: c.y - 8, size: 7, font: c.bold, color: GREY });
        lines.forEach((ln, j) => c.page.drawText(ln, { x, y: c.y - 21 - j * 12.5, size: 9.5, font: c.reg, color: INK }));
      });
      c.y -= h;
    }
  };
  // full title (may be long)
  for (const ln of wrap(w.title, c.bold, 15, width)) { c.page.drawText(ln, { x: M, y: c.y - 15, size: 15, font: c.bold, color: NAVY }); c.y -= 19; }
  para(`${w.department ?? ""}${w.category ? ` · ${CATEGORY_LABEL[w.category]}` : ""}${w.themeWeek ? ` · Week ${w.themeWeek}${o.weekLabel ? ` (${o.weekLabel})` : ""}` : ""}`, 9.5);

  heading("Schedule and venue");
  grid([
    [w.days > 1 ? "Dates" : "Date", `${dateText(r)}${w.days > 1 ? ` (${w.days} full days)` : ""}`], ["Time (24h)", r.time.replace("–", "-")], ["Venue", venueText(r)],
    ["Mode", { ONSITE: "Onsite", ONLINE: "Online", HYBRID: "Hybrid" }[w.mode] ?? w.mode], ["Seat cap", w.capacity], ["Fee", pkr(w.fee)],
    ["CME hours", w.cmeHours], ["Format", w.format], ["Target audience", w.targetAudience],
    ["Organising person", w.organiser], ["Contributing departments", o.departments.join(", ")], ["Submitted", w.submittedAt ? fmtDateTime(w.submittedAt) : null],
    ...(w.onlineLink ? [["Online link", w.onlineLink] as [string, string]] : []),
  ]);
  if (w.description) { heading("Description"); para(w.description); }
  if (w.objectives) { heading("Educational objectives"); para(w.objectives); }
  if (w.prelimProgramme) { heading("Preliminary programme"); para(w.prelimProgramme, 9); }

  heading("Workshop Director");
  grid([["Name", w.leadFaculty], ["Degrees", w.facultyDegrees], ["Contact", w.facultyContact]]);
  if (w.facultyProfile) para(w.facultyProfile);
  if (w.facilitatorNames.length) { para(`Facilitators: ${w.facilitatorNames.join(", ")}`); }

  heading("People and equipment");
  para(`${w.facilitators} facilitators · ${w.volunteers} volunteers · ${w.technicians} technicians`);
  if (w.equipment.length) grid(w.equipment.flatMap((e) => [["Item", e.item], ["Qty", e.qty], ["Source", e.source]] as [string, string | number][]));

  heading("Registrations");
  grid([["Registered", `${r.booked} / ${w.capacity ?? "-"}`], ["Paid", r.confirmed], ["Checked in", r.attended], ["Waiting list", r.waiting], ["Income", pkr(r.income)], ["Status", statusText(r)]]);
  footers(c);
  return c.doc.save();
}
