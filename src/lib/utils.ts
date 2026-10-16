export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export const TZ = "Asia/Karachi";
export const fmtDate = (d: Date | string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).format(new Date(d));
export const fmtTime = (d: Date | string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(d)).toUpperCase();
export const fmtDateTime = (d: Date | string) => `${fmtDate(d, { day: "2-digit", month: "short", year: "numeric" })}, ${fmtTime(d)}`;
export const pkr = (n: number) => `PKR ${n.toLocaleString("en-PK")}`;
export const initials = (name: string) =>
  name.replace(/^(Prof\.|Dr\.|Mr\.|Ms\.|Assoc\.|Asst\.)\s*/gi, "").split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
export const wordCount = (s: string) => (s.trim().match(/\S+/g) || []).length;
export const appUrl = () =>
  (process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3000").replace(/\/$/, "");
export const randomToken = (bytes = 24) => {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return Buffer.from(a).toString("base64url");
};
export const SESSION_TYPE_LABEL: Record<string, string> = {
  KEYNOTE: "Keynote", PLENARY: "Plenary", SCIENTIFIC: "Scientific", PANEL: "Panel", WORKSHOP: "Workshop", CEREMONY: "Ceremony", BREAK: "Break",
};
export const TITLES = ["Prof.", "Assoc. Prof.", "Asst. Prof.", "Lecturer", "Dr.", "Mr.", "Ms."];
export const SPECIALTIES = [
  "Anaesthesiology", "Cardiology", "Community Medicine / Public Health", "Dentistry", "Dermatology", "Emergency Medicine", "Endocrinology",
  "ENT", "Family Medicine", "Gastroenterology", "General Surgery", "Gynaecology & Obstetrics", "Haematology", "Health Management / Administration",
  "Health Economics", "Health Informatics / IT", "Internal Medicine", "Medical Education", "Nephrology", "Neurology", "Neurosurgery", "Nursing",
  "Oncology", "Ophthalmology", "Orthopaedics", "Paediatrics", "Pathology", "Pharmacy", "Physiotherapy / Allied Health", "Psychiatry",
  "Pulmonology", "Radiology", "Urology", "Other",
];
export const COUNTRIES = [
  "Pakistan", "Afghanistan", "Bahrain", "Bangladesh", "Canada", "China", "Egypt", "Germany", "India", "Indonesia", "Iran", "Iraq", "Jordan",
  "Kuwait", "Malaysia", "Nepal", "Oman", "Qatar", "Saudi Arabia", "Sri Lanka", "Turkey", "United Arab Emirates", "United Kingdom",
  "United States", "Other",
];

/** Processing fee in PKR for a subtotal (percentage set in Event Settings; 0 by default). */
export const processingFee = (subtotal: number, pct: number) => Math.round((subtotal * (pct || 0)) / 100);
export const SESSION_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft", SUBMITTED: "Submitted", UNDER_REVIEW: "Under review", APPROVED: "Approved", REJECTED: "Rejected",
};
export const fmtTime24 = (d: Date | string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(d));
/** yyyy-mm-dd in Pakistan time */
export const ymdPk = (d: Date | string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d));
