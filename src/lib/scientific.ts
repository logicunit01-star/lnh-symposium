// Scientific programme: master data and labels from LNH's Oct 2026 forms (SC Agenda form, Abstract Submission Form, department.xlsx).
import type { SessionSlot } from "./db/schema";

/** 50 specialities / sessions (SC requirements V1.0, 26 Oct 2026; physiotherapy, speech and occupational therapy share one session). */
export const DEPARTMENTS = [
  "Cardiac Surgery", "General Surgery", "Neurosurgery", "Orthopedic Surgery", "Urology", "Cardiology", "Endocrinology", "Gastroenterology",
  "Infectious Disease", "Internal Medicine", "Dental & Maxillofacial Surgery", "Accident & Emergency", "ENT", "Ophthalmology", "Radiology",
  "Admin/ Management", "Health Profession Education", "Quality Assurance", "Ethical review committee", "Family Medicine", "Anatomy", "Biochemistry",
  "Community Medicine", "Forensic Medicine", "Pharmacology", "Physiology", "Obstetrics/ Gynecology", "Pharmacy", "Thoracic Surgery", "Plastic Surgery",
  "Dermatology", "Nephrology", "Oncology", "Pulmonology/Chest medicine", "Chemical Pathology", "Histopathology", "Microbiology", "Molecular Pathology",
  "Hematology", "Anesthesia", "Breast Surgery", "Pediatric surgery", "Vascular Surgery", "Rheumatology", "Neurology", "Psychiatry/Mental Health",
  "Pediatric medicine", "Medical Technology (BSMT)", "Nursing", "Physiotherapy / Speech therapy / Occupational therapy",
];

/** Fixed scientific session slots (SC Agenda form). Keys are stable: "<date>|<start>". */
const slot = (day: string, start: string, end: string, optional = false, special?: SessionSlot["special"]): SessionSlot => ({ key: `${day}|${start}`, day, start, end, optional, ...(special ? { special } : {}) });
export const DEFAULT_SLOTS: SessionSlot[] = [
  slot("2027-01-29", "08:30", "10:30"), slot("2027-01-29", "11:00", "13:00", false, "PLENARY"), slot("2027-01-29", "13:45", "15:30"), slot("2027-01-29", "15:45", "17:30"),
  slot("2027-01-30", "08:30", "10:30"), slot("2027-01-30", "11:00", "13:00", false, "DEBATE"), slot("2027-01-30", "13:45", "15:30"), slot("2027-01-30", "15:45", "17:30"),
  slot("2027-01-31", "09:00", "11:00"), slot("2027-01-31", "11:15", "13:00"), slot("2027-01-31", "13:15", "15:30", true),
];

export const SESSION_FORMATS: Record<string, string> = {
  INVITED_PAPERS: "Invited speaker(s) + research papers",
  PAPERS_ONLY: "Research papers only",
  GUEST_ONLY: "Invited guest speakers only",
  PANEL: "Panel discussion",
  CASE_BASED: "Case-based session",
  OTHER: "Other",
  PLENARY: "Plenary session",
  DEBATE: "Debate session",
};
/** Committee-only formats held in the fixed plenary (Day 1, 11:00–13:00) and debate (Day 2, 11:00–13:00) slots. */
export const SPECIAL_FORMATS = ["PLENARY", "DEBATE"] as const;
export const isSpecialFormat = (f: string | null | undefined) => f === "PLENARY" || f === "DEBATE";
export const SPECIAL_DEPT = "Scientific Committee";
export const formatToType = (f: string) => (f === "PANEL" || f === "DEBATE" ? "PANEL" : f === "PLENARY" ? "PLENARY" : "SCIENTIFIC") as "PANEL" | "SCIENTIFIC" | "PLENARY";

export const PEOPLE_ROLES: Record<string, string> = {
  CHAIR: "Chairperson", CO_CHAIR: "Co-Chairperson", MODERATOR: "Moderator", PANELIST: "Panelist", SPEAKER: "Guest / invited speaker", KEYNOTE: "Keynote speaker", PRESENTER: "Research paper presenter",
};

/** Default agenda guidance per format (editable in Event Settings). */
export const DEFAULT_AGENDA_TEMPLATES: Record<string, string> = {
  INVITED_PAPERS: "5 min  Opening by Chairperson\n20 min Invited speaker talk (per speaker)\n10 min Research paper (8 + 2 Q&A, per paper)\n10 min Discussion and closing",
  PAPERS_ONLY: "5 min  Opening by Chairperson\n10 min Research paper (8 + 2 Q&A, per paper)\n10 min Judges' remarks and closing",
  GUEST_ONLY: "5 min  Opening by Chairperson\n20–25 min Guest speaker talk (per speaker)\n15 min Q&A and closing",
  PANEL: "5 min  Moderator introduction\n10 min Opening statement (per panelist)\n40 min Moderated discussion\n15 min Audience Q&A and closing",
  CASE_BASED: "5 min  Opening\n15 min Case presentation (per case)\n10 min Expert commentary (per case)\n10 min Discussion and closing",
  OTHER: "Describe the planned structure in the session title/topic.",
  PLENARY: "5 min  Welcome by Moderator\n30 min Keynote address (per keynote speaker)\n40 min Panel discussion\n15 min Audience Q&A and closing",
  DEBATE: "5 min  Moderator sets the motion\n8 min  Opening statement (per panelist)\n30 min Rebuttals and moderated debate\n15 min Audience Q&A and vote\n5 min  Keynote summary and closing",
};

/** HOD abstract scoring sheet: 5 criteria, 1–5 each (max 25). */
export const SCORE_CRITERIA: [string, string][] = [
  ["originality", "Originality and relevance"],
  ["methods", "Methodology / case description"],
  ["results", "Results and conclusions supported"],
  ["clarity", "Clarity, structure and language"],
  ["impact", "Contribution to practice"],
];

export const PREF_LABEL: Record<string, string> = { ORAL: "Oral presentation", POSTER: "Poster presentation", EITHER: "Either (oral preferred)" };
export const HOD_DECISION_LABEL: Record<string, string> = { ACCEPT_ORAL: "Accept as oral", ACCEPT_POSTER: "Accept as poster", REJECT: "Reject", BACK: "Return to the Symposium Secretariat" };
/** Short labels for the three review options (SC feedback, 29 Oct 2026): Accept, Reject, Return to the Symposium Secretariat. */
export const decisionLabel = (d: string, pref: string | null) =>
  d === "ACCEPT_ORAL" ? (pref === "ORAL" ? "Accept" : "Accept as oral") : d === "ACCEPT_POSTER" ? (pref === "POSTER" ? "Accept" : "Accept as poster") : HOD_DECISION_LABEL[d] ?? d;
/** Decisions offered for a preference (Abstract Submission Form). "Either" abstracts are accepted as oral or as poster. */
export const decisionsFor = (pref: string | null) =>
  pref === "POSTER" ? ["ACCEPT_POSTER", "REJECT", "BACK"] : pref === "ORAL" ? ["ACCEPT_ORAL", "REJECT", "BACK"] : ["ACCEPT_ORAL", "ACCEPT_POSTER", "REJECT", "BACK"];

/** Abstract sections with their word limits (SC feedback, 29 Oct 2026; 300 words in total).
 *  Original research: Introduction 50, Methods 100, Results 100, Conclusion 50. Case report / series: Introduction 70, Case 230. */
export const SECTIONS: Record<string, [string, string][]> = {
  ORIGINAL: [["background", "Introduction"], ["methods", "Methods"], ["results", "Results"], ["conclusion", "Conclusion"]],
  CASE: [["background", "Introduction"], ["cases", "Case report / series"]],
};
export const SECTION_LIMITS: Record<string, Record<string, number>> = {
  ORIGINAL: { background: 50, methods: 100, results: 100, conclusion: 50 },
  CASE: { background: 70, cases: 230 },
};
export const ABSTRACT_TOTAL_WORDS = 300;
/** Characters allowed per section (guards against pasted text without spaces): about 12 characters per allowed word. */
export const charLimit = (words: number) => words * 12;

/** Quality-check guidelines shown to HODs during review (editable in Event Settings). */
export const DEFAULT_QC_GUIDELINES = [
  "Title: clear, specific and no longer than 35 words; no abbreviations without expansion.",
  "Structure: every required section is present and within its word limit (300 words in total).",
  "Introduction states the problem and the aim or research question.",
  "Methods describe design, setting, participants and analysis (case reports: the clinical course and investigations).",
  "Results report actual findings with numbers; no \"results will be presented\".",
  "Conclusion follows from the results and does not overstate them.",
  "Originality: not previously published or presented in the same form.",
  "Ethics: approval or waiver is declared where patients or patient data are involved; no identifiable patient details.",
  "Language: clear and readable; spelling and grammar acceptable for the e-abstract book.",
  "Decide: Accept, Reject, or Return to the Symposium Secretariat if the abstract belongs to another speciality or needs the committee's view.",
].join("\n");
export const KIND_LABEL: Record<string, string> = { ORIGINAL: "Original research", CASE: "Case report / case series" };

export const titleKey = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const words = (t: string) => (t.trim().match(/\S+/g) || []).length;

export const INVITE_LABEL: Record<string, string> = { NOT_SENT: "Not sent", SENT: "Sent, no response", ACCEPTED: "Accepted", DECLINED: "Declined", FAILED: "Delivery failed", WITHDRAWN: "Withdrawn" };

export const slotLabel = (s: SessionSlot) => {
  const d = new Date(`${s.day}T12:00:00+05:00`);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", weekday: "short", day: "numeric", month: "short" }).format(d);
  return `${day} · ${s.start}–${s.end}${s.optional ? " (optional)" : ""}${s.special ? ` · ${s.special === "PLENARY" ? "Plenary" : "Debate"}` : ""}`;
};
