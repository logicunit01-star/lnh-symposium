// Demo content (fictional speakers; workshop titles follow LNH's sample concept list).
// Used by `npm run db:seed` (only when empty) and by Admin → Event Settings → "Reset demo content".
import { eq, sql } from "drizzle-orm";
import { db as defaultDb, schema as s } from "./db";

type DB = typeof defaultDb;
const D = (x: string) => new Date(x); // ISO with +05:00 (PKT)

export const EVENT_DEFAULTS = {
  edition: "9th",
  name: "9th LNH Symposium 2027",
  theme: "Healthcare Conundrum: Cost, Quality, and Technology",
  mainTheme: "Shaping the new era of healthcare: AI-Robotics and Digitization",
  tagline: "Where artificial intelligence, robotics and digital care meet the realities of cost and quality.",
  startDate: D("2027-01-20T08:30:00+05:00"),
  endDate: D("2027-01-31T17:00:00+05:00"),
  eventDays: ["2027-01-20", "2027-01-30", "2027-01-31"],
  venue: "Liaquat National Hospital & Medical College, Stadium Road, Karachi",
  regPrefix: "SYM",
  earlyBirdUntil: D("2026-12-10T23:59:59+05:00"),
  abstractOpen: D("2026-10-15T00:00:00+05:00"),
  abstractDeadline: D("2026-12-04T23:59:59+05:00"),
  workshopStart: D("2026-12-14T00:00:00+05:00"),
  workshopEnd: D("2027-01-14T23:59:59+05:00"),
  themeWeeks: [
    { from: "2026-12-14", label: "Emergency, trauma and critical care" },
    { from: "2026-12-21", label: "Women and child health" },
    { from: "2026-12-28", label: "Medicine and diagnostics" },
    { from: "2027-01-04", label: "Research, AI and surgical innovation" },
    { from: "2027-01-11", label: "Primary care, nursing and preparedness" },
  ],
  seatTarget: 3000,
  usdRate: 280,
};

/** Placeholder rooms — replace from Admin → Venues. mapX/mapY are % positions on the campus schematic. */
export const VENUES = [
  { name: "Main Auditorium", building: "Academic Block", floor: "Ground", capacity: 400, onlineFacility: "Zoom + live stream", equipment: "Stage, 3 projectors, PA, 4 wireless mics", mapX: 48, mapY: 28, directions: "Main gate → straight past the fountain; entrance on the left." },
  { name: "Lecture Hall A", building: "Medical College", floor: "1st", capacity: 150, onlineFacility: "Zoom", equipment: "Projector, PA, lectern", mapX: 22, mapY: 38, directions: "Medical College lobby → stairs to 1st floor, east wing." },
  { name: "Lecture Hall C", building: "Medical College", floor: "2nd", capacity: 60, onlineFacility: "Zoom", equipment: "Projector, 60 power points for laptops", mapX: 18, mapY: 52, directions: "Medical College lobby → lift to 2nd floor." },
  { name: "Skill Lab", building: "Clinical Skills Centre", floor: "Ground", capacity: 60, onlineFacility: null, equipment: "12 stations, airway and IV trainers, ultrasound phantoms", mapX: 70, mapY: 55, directions: "Behind the Emergency block; follow CSC signs." },
  { name: "Simulation Center", building: "Clinical Skills Centre", floor: "1st", capacity: 40, onlineFacility: "Recording + debrief room", equipment: "High-fidelity adult, paediatric and birthing simulators", mapX: 76, mapY: 46, directions: "Clinical Skills Centre → 1st floor." },
  { name: "Robotics & Skills Lab", building: "Surgical Tower", floor: "4th", capacity: 20, onlineFacility: "Recording", equipment: "Robotic console simulator, dry-lab boxes", mapX: 62, mapY: 22, directions: "Surgical Tower lifts → 4th floor, OT corridor." },
  { name: "IT Lab", building: "Library & IT Block", floor: "1st", capacity: 35, onlineFacility: "Zoom", equipment: "35 desktops with SPSS and Office", mapX: 32, mapY: 70, directions: "Library entrance → 1st floor." },
  { name: "Main Foyer", building: "Academic Block", floor: "Ground", capacity: 600, onlineFacility: null, equipment: "Registration counters", mapX: 50, mapY: 38, directions: "Inside the main entrance." },
  { name: "Exhibition Hall", building: "Academic Block", floor: "Lower ground", capacity: 300, onlineFacility: null, equipment: "40 stalls, 80 poster boards", mapX: 40, mapY: 20, directions: "Academic Block → lower ground." },
];

const SPEAKERS: { title: string; name: string; degrees: string; designation: string; institution: string; topic: string; featured: boolean }[] = [
  { title: "Prof.", name: "Ayesha Rahman", degrees: "MBBS, MPH, PhD", designation: "Dean, Health Policy", institution: "Karachi Institute of Health Sciences", topic: "Value-based care in the age of AI", featured: true },
  { title: "Dr.", name: "Omar Siddiqui", degrees: "MBBS, MS (Health Informatics)", designation: "Chief Medical Information Officer", institution: "Metro Health Network", topic: "AI at the bedside: from hype to workflow", featured: true },
  { title: "Prof.", name: "Sara Mahmood", degrees: "MBBS, FCPS (Medicine)", designation: "Professor of Medicine", institution: "LNH Medical College", topic: "Quality metrics for the digital hospital", featured: true },
  { title: "Dr.", name: "James Whitfield", degrees: "PhD (Health Economics)", designation: "Health Economist", institution: "Global Health Economics Group", topic: "The cost case for automation", featured: true },
  { title: "Prof.", name: "Farhan Ali", degrees: "MBBS, FCPS, FRCS", designation: "Director, Minimal Access & Robotic Surgery", institution: "LNH Medical College", topic: "Robotic surgery: outcomes and economics", featured: true },
  { title: "Dr.", name: "Hina Qureshi", degrees: "MBBS, FCPS (Radiology)", designation: "Consultant Radiologist", institution: "Liaquat National Hospital", topic: "AI in imaging: from triage to diagnosis", featured: true },
  { title: "Dr.", name: "Bilal Ahmed", degrees: "MBBS, MBA", designation: "Head of Digital Health", institution: "Pakistan Telehealth Forum", topic: "Telemedicine at national scale", featured: false },
  { title: "Prof.", name: "Nadia Kareem", degrees: "MBBS, FCPS (Community Medicine)", designation: "Professor of Community Medicine", institution: "Sindh Public Health Institute", topic: "Digital pathways to universal health coverage", featured: false },
  { title: "Dr.", name: "Usman Tariq", degrees: "MBBS, FCPS (Critical Care)", designation: "Consultant Intensivist", institution: "Liaquat National Hospital", topic: "Smart ICUs: monitoring and early warning", featured: false },
  { title: "Dr.", name: "Maria Fernandes", degrees: "MD, CPHQ", designation: "Quality & Accreditation Lead", institution: "Healthcare Accreditation Advisors", topic: "Accreditation for digital-first hospitals", featured: false },
  { title: "Dr.", name: "Zain Haider", degrees: "PhD (Data Science)", designation: "Lead Data Scientist", institution: "LNH Research Unit", topic: "Real-world data and responsible AI", featured: false },
  { title: "Prof.", name: "Rukhsana Begum", degrees: "PhD (Nursing)", designation: "Director Nursing", institution: "LNH College of Nursing", topic: "Nursing in a digitized ward", featured: false },
];

const COMMITTEE = [
  ["Patron-in-Chief", "Prof. Placeholder Name", "Chief Executive Officer", "Administration", "Patrons"],
  ["Patron", "Prof. Placeholder Name", "Principal, LNH&MC", "Medical College", "Patrons"],
  ["Chairperson", "Prof. Placeholder Name", "Chair, Scientific Committee", "Medical Education", "Scientific Committee"],
  ["Scientific Secretary", "Dr. Placeholder Name", "Associate Professor", "Community Medicine", "Scientific Committee"],
  ["Member", "Dr. Placeholder Name", "Associate Professor", "Pathology", "Scientific Committee"],
  ["Member", "Dr. Placeholder Name", "Assistant Professor", "Biostatistics", "Scientific Committee"],
  ["Chair", "Prof. Placeholder Name", "Head of Department", "Medicine", "Organizing Committee"],
  ["Co-Chair", "Dr. Placeholder Name", "Head of Department", "Surgery", "Organizing Committee"],
  ["Member", "Dr. Placeholder Name", "Consultant", "Paediatrics", "Organizing Committee"],
  ["Member", "Ms. Placeholder Name", "Manager", "Information Technology", "Organizing Committee"],
  ["Co-Chair", "Dr. Placeholder Name", "Coordinator", "Workshop Programme (WP) Committee", "Workshop Committee"],
  ["Lead", "Mr. Placeholder Name", "Manager Events", "Corporate Communications", "Logistics"],
];

type P = {
  date: string; s: string; e: string; day: number; type: string; title: string; hall: string; desc?: string; sp?: number[];
  track?: string; reg?: boolean; cap?: number; fee?: number; efee?: number; cme?: number; dept?: string; format?: string; status?: string;
};

// Symposium days: 20 Jan (AI), 30 Jan (Robotics), 31 Jan (Digitization). Workshops: pre-conference, 14 Dec 2026 – 12 Jan 2027.
const PROGRAMME: P[] = [
  { date: "2027-01-20", day: 1, s: "08:30", e: "09:30", type: "CEREMONY", title: "Registration & Breakfast", hall: "Main Foyer" },
  { date: "2027-01-20", day: 1, s: "09:30", e: "10:30", type: "CEREMONY", title: "Inaugural Ceremony", hall: "Main Auditorium", desc: "Recitation, welcome address and opening remarks." },
  { date: "2027-01-20", day: 1, s: "10:30", e: "11:15", type: "KEYNOTE", title: "Keynote: AI at the Bedside — From Hype to Workflow", hall: "Main Auditorium", sp: [1], track: "AI", desc: "Where clinical AI is already changing decisions, and what it takes to deploy it safely." },
  { date: "2027-01-20", day: 1, s: "11:15", e: "11:45", type: "BREAK", title: "Tea Break & Exhibition", hall: "Exhibition Hall" },
  { date: "2027-01-20", day: 1, s: "11:45", e: "13:15", type: "PLENARY", title: "Plenary I — AI in Diagnosis and Decision Support", hall: "Main Auditorium", sp: [5, 10, 1], track: "AI", reg: true, cap: 400, desc: "Imaging, pathology and early-warning models: evidence, cost and quality." },
  { date: "2027-01-20", day: 1, s: "14:15", e: "15:45", type: "SCIENTIFIC", title: "Scientific Session A — Oral Abstracts (AI & Data Science)", hall: "Lecture Hall A", sp: [10], track: "AI", reg: true, cap: 150, desc: "Selected oral presentations judged by the Scientific Committee." },
  { date: "2027-01-20", day: 1, s: "16:00", e: "17:00", type: "PANEL", title: "Panel: Who Is Accountable When the Algorithm Is Wrong?", hall: "Main Auditorium", sp: [9, 10, 0], track: "AI" },
  { date: "2027-01-30", day: 2, s: "09:00", e: "09:45", type: "KEYNOTE", title: "Keynote: Robotic Surgery — Outcomes and Economics", hall: "Main Auditorium", sp: [4], track: "Robotics", desc: "What a decade of robotic programmes tells us about outcomes, training and cost." },
  { date: "2027-01-30", day: 2, s: "09:45", e: "11:15", type: "PLENARY", title: "Plenary II — Robotics in the OR, ICU and Pharmacy", hall: "Main Auditorium", sp: [4, 8, 3], track: "Robotics", reg: true, cap: 400 },
  { date: "2027-01-30", day: 2, s: "11:15", e: "11:45", type: "BREAK", title: "Tea Break & Poster Viewing", hall: "Exhibition Hall" },
  { date: "2027-01-30", day: 2, s: "11:45", e: "13:15", type: "SCIENTIFIC", title: "Scientific Session B — Oral Abstracts (Surgery & Robotics)", hall: "Lecture Hall A", sp: [4], track: "Robotics", reg: true, cap: 150 },
  { date: "2027-01-30", day: 2, s: "14:00", e: "15:00", type: "PANEL", title: "Panel: The Price of a Robot — Who Pays?", hall: "Main Auditorium", sp: [3, 0, 7], track: "Robotics" },
  { date: "2027-01-30", day: 2, s: "15:00", e: "16:30", type: "SCIENTIFIC", title: "Poster Walk & Judging", hall: "Exhibition Hall", track: "Robotics", desc: "Poster presenters at their boards; judges score on scientific merit and presentation." },
  { date: "2027-01-31", day: 3, s: "09:00", e: "09:45", type: "KEYNOTE", title: "Keynote: Digital Pathways to Universal Health Coverage", hall: "Main Auditorium", sp: [7], track: "Digitization" },
  { date: "2027-01-31", day: 3, s: "09:45", e: "11:15", type: "PLENARY", title: "Plenary III — EHR, Telemedicine and Interoperability", hall: "Main Auditorium", sp: [6, 2, 11], track: "Digitization", reg: true, cap: 400 },
  { date: "2027-01-31", day: 3, s: "11:30", e: "13:00", type: "SCIENTIFIC", title: "Scientific Session C — Oral Abstracts (Digital Health & Quality)", hall: "Lecture Hall A", sp: [2], track: "Digitization", reg: true, cap: 150 },
  { date: "2027-01-31", day: 3, s: "16:00", e: "17:00", type: "CEREMONY", title: "Awards & Closing Ceremony", hall: "Main Auditorium", desc: "Best oral and poster awards, vote of thanks." },
  // ---- Pre-conference workshops (day 0) ----
  { date: "2026-12-14", day: 0, s: "08:30", e: "16:20", type: "WORKSHOP", title: "Critical Care Day: Ventilation, Bedside Ultrasound and Haemodynamics", hall: "Skill Lab", sp: [8, 5], dept: "Critical Care", format: "Hands-on", reg: true, cap: 60, fee: 3000, efee: 2500, cme: 6, track: "AI", desc: "Ventilator modes, lung and cardiac ultrasound, and haemodynamic monitoring at the bedside, with AI-assisted waveform interpretation." },
  { date: "2026-12-14", day: 0, s: "09:00", e: "13:00", type: "WORKSHOP", title: "Trauma Team Simulation", hall: "Simulation Center", sp: [4], dept: "General Surgery", format: "Simulation", reg: true, cap: 30, fee: 2000, efee: 1500, cme: 4, track: "Robotics", desc: "High-fidelity mannequin scenarios for trauma team leaders and members: primary survey, massive transfusion and communication." },
  { date: "2026-12-22", day: 0, s: "10:00", e: "15:30", type: "WORKSHOP", title: "Obstetric Emergencies Simulation", hall: "Simulation Center", sp: [11], dept: "Obstetrics & Gynaecology", format: "Simulation", reg: true, cap: 40, fee: 3000, efee: 2500, cme: 5, track: "Robotics", desc: "Post-partum haemorrhage, shoulder dystocia and eclampsia drills on birthing simulators." },
  { date: "2026-12-29", day: 0, s: "08:00", e: "12:00", type: "WORKSHOP", title: "ECG Across Ages: Adult, Paediatric and Perioperative", hall: "Lecture Hall A", sp: [2], dept: "Cardiology", format: "Lecture", reg: true, cap: 50, fee: 2000, efee: 1500, cme: 4, track: "AI", desc: "Systematic ECG reading across age groups, with AI-ECG tools compared against expert reads." },
  { date: "2027-01-05", day: 0, s: "09:00", e: "12:30", type: "WORKSHOP", title: "AI Tools in Clinical Practice and Research", hall: "Lecture Hall C", sp: [1, 10], dept: "Health Informatics", format: "Hands-on", reg: true, cap: 40, fee: 3000, efee: 2500, cme: 3.5, track: "AI", desc: "Safe, practical use of AI for literature review, documentation, coding and decision support. Laptops required." },
  { date: "2027-01-05", day: 0, s: "13:00", e: "17:00", type: "WORKSHOP", title: "Data Analysis with SPSS", hall: "Lecture Hall C", sp: [10], dept: "Research & Biostatistics", format: "Hands-on", reg: true, cap: 30, fee: 2500, efee: 2000, cme: 4, track: "Digitization", desc: "From clean data to tables and tests: descriptive statistics, t-tests, chi-square and regression in SPSS." },
  { date: "2027-01-08", day: 0, s: "09:00", e: "13:00", type: "WORKSHOP", title: "Robotic Surgery Skills Lab", hall: "Robotics & Skills Lab", sp: [4], dept: "General Surgery", format: "Simulation", reg: true, cap: 20, fee: 5000, efee: 4500, cme: 4, track: "Robotics", desc: "Console orientation, camera control and dry-lab tasks on a robotic surgery simulator." },
  { date: "2027-01-12", day: 0, s: "08:30", e: "16:30", type: "WORKSHOP", title: "Mass Casualty and Evacuation Drill", hall: "Main Auditorium", sp: [8], dept: "Emergency Medicine", format: "Drill", reg: true, cap: 80, fee: 2000, efee: 1500, cme: 6, track: "Digitization", desc: "Triage, command structure and digital patient tracking during a hospital-wide mass casualty drill." },
  // Not yet approved — hidden from the public catalog until the committee approves them.
  { date: "2027-01-07", day: 0, s: "09:00", e: "12:00", type: "WORKSHOP", title: "Point-of-Care Ultrasound for Nurses", hall: "Skill Lab", sp: [11], dept: "Nursing", format: "Hands-on", reg: true, cap: 25, fee: 1500, cme: 3, status: "SUBMITTED" },
  { date: "2027-01-11", day: 0, s: "14:00", e: "17:00", type: "WORKSHOP", title: "Telemedicine Consultation Skills", hall: "IT Lab", sp: [6], dept: "Family Medicine", format: "Hands-on", reg: true, cap: 30, fee: 2000, cme: 3, status: "UNDER_REVIEW" },
];

// Extra Form A detail for demo workshops (by title prefix).
const WS_EXTRA: Record<string, { cat: "A" | "B"; contrib?: string; fac: number; vol: number; tech: number; eq: [string, number, string][] }> = {
  "Critical Care Day": { cat: "A", contrib: "Anaesthesia, Emergency Medicine", fac: 6, vol: 4, tech: 2, eq: [["Ventilator (demo)", 4, "ICU loan"], ["Ultrasound machine", 3, "Radiology"], ["Lung phantom", 4, "Skill Lab"]] },
  "Trauma Team": { cat: "A", contrib: "Emergency Medicine, Anaesthesia", fac: 4, vol: 2, tech: 1, eq: [["High-fidelity mannequin", 2, "Sim Center"], ["Rapid infuser", 1, "ED loan"]] },
  "Obstetric Emergencies": { cat: "B", fac: 4, vol: 2, tech: 1, eq: [["Birthing simulator", 2, "Sim Center"], ["PPH kit", 6, "Purchase"]] },
  "ECG Across Ages": { cat: "A", contrib: "Paediatrics, Anaesthesia", fac: 3, vol: 2, tech: 0, eq: [["ECG printouts (sets)", 50, "Cardiology"]] },
  "AI Tools": { cat: "A", contrib: "Research & Biostatistics", fac: 2, vol: 2, tech: 1, eq: [["Wi-Fi access codes", 40, "IT"]] },
  "Data Analysis with SPSS": { cat: "B", fac: 2, vol: 1, tech: 1, eq: [["SPSS licences", 30, "IT"], ["Sample datasets (USB)", 30, "Research Unit"]] },
  "Robotic Surgery": { cat: "B", fac: 2, vol: 1, tech: 2, eq: [["Robotic console simulator", 1, "Sponsor loan"], ["Dry-lab task boxes", 6, "Skill Lab"]] },
  "Mass Casualty": { cat: "A", contrib: "Nursing, Security, Administration", fac: 8, vol: 20, tech: 3, eq: [["Triage tags", 300, "Purchase"], ["Stretchers", 20, "Hospital stores"], ["Moulage kits", 30, "Sim Center"]] },
  "Point-of-Care Ultrasound": { cat: "B", fac: 3, vol: 1, tech: 1, eq: [["Ultrasound machine", 3, "Radiology"]] },
  "Telemedicine": { cat: "B", fac: 2, vol: 1, tech: 1, eq: [["Headsets", 30, "IT"]] },
};

export function themeWeekOf(dateIso: string, weeks: { from: string }[]) {
  let w = 0;
  weeks.forEach((x, i) => { if (dateIso >= x.from) w = i + 1; });
  return w || null;
}

const slugify = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

/** Inserts speakers, committee and programme. With reset=true, clears registrations, programme and people first. */
export async function seedDemoContent(db: DB = defaultDb, opts: { reset?: boolean } = {}) {
  if (opts.reset) {
    await db.delete(s.feedback);
    await db.delete(s.payments);
    await db.delete(s.registrationItems);
    await db.delete(s.registrations);
    await db.delete(s.waitlist);
    await db.delete(s.sessionReviews);
    await db.delete(s.sessionSpeakers);
    await db.delete(s.sessions);
    await db.delete(s.venues);
    await db.delete(s.speakers);
    await db.delete(s.committee);
    await db.delete(s.accounts);
    await db.update(s.event).set(EVENT_DEFAULTS).where(eq(s.event.id, 1));
  } else {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.speakers);
    if (n > 0) return false;
  }
  const speakerRows = await db.insert(s.speakers).values(SPEAKERS.map((x, i) => ({
    ...x, order: i, linkedin: "https://www.linkedin.com/",
    bio: `${x.title} ${x.name} (${x.degrees}) is ${x.designation.toLowerCase()} at ${x.institution}, working on ${x.topic.toLowerCase()}. (Placeholder bio — replace from the admin panel.)`,
  }))).returning({ id: s.speakers.id });

  await db.insert(s.venues).values(VENUES).onConflictDoNothing();
  const venueRows = await db.select({ id: s.venues.id, name: s.venues.name }).from(s.venues);
  const venueId = (name: string) => venueRows.find((v) => v.name === name)?.id ?? null;

  await db.insert(s.committee).values(COMMITTEE.map(([role, name, designation, department, group], i) => ({ role, name, designation, department, group, order: i })));

  for (const x of PROGRAMME) {
    const at = (hm: string) => D(`${x.date}T${hm}:00+05:00`);
    const [row] = await db.insert(s.sessions).values({
      slug: `${x.day ? "d" + x.day : "ws"}-${slugify(x.title)}`, type: x.type as any, title: x.title, description: x.desc, track: x.track,
      department: x.dept, format: x.format, status: x.status ?? "APPROVED", day: x.day,
      startsAt: at(x.s), endsAt: at(x.e), hall: x.hall, capacity: x.cap ?? null, fee: x.fee ?? 0, earlyFee: x.efee ?? null,
      registrable: !!x.reg, cmeHours: x.cme ?? null, venueId: venueId(x.hall),
      ...(x.type === "WORKSHOP" ? workshopExtra(x, x.sp?.[0] != null ? SPEAKERS[x.sp[0]] : undefined) : {}),
    }).returning({ id: s.sessions.id });
    if (x.sp?.length) {
      await db.insert(s.sessionSpeakers).values(x.sp.map((i, k) => ({
        sessionId: row.id, speakerId: speakerRows[i].id,
        role: x.type === "PANEL" ? (k === 0 ? "Moderator" : "Panelist") : x.type === "WORKSHOP" ? (k === 0 ? "Lead Faculty" : "Faculty") : "Speaker",
      })));
    }
  }
  return true;
}

function workshopExtra(x: P, lead?: (typeof SPEAKERS)[number]) {
  const key = Object.keys(WS_EXTRA).find((k) => x.title.startsWith(k));
  const e = key ? WS_EXTRA[key] : undefined;
  const status = x.status ?? "APPROVED";
  const submitted = new Date(Date.parse(`${x.date}T09:00:00+05:00`) - 40 * 864e5);
  return {
    category: e?.cat ?? "B", contributors: e?.contrib ?? null,
    themeWeek: themeWeekOf(x.date, EVENT_DEFAULTS.themeWeeks),
    leadFaculty: lead ? `${lead.title} ${lead.name}` : null, facultyDegrees: lead?.degrees ?? null,
    facultyContact: "0300-0000000", facultyProfile: lead ? `${lead.designation}, ${lead.institution}. (Placeholder — replace in Form A.)` : null,
    facilitators: e?.fac ?? 2, volunteers: e?.vol ?? 1, technicians: e?.tech ?? 0,
    equipment: (e?.eq ?? []).map(([item, qty, source]) => ({ item, qty, source })),
    submittedAt: submitted,
    reviewedAt: status === "APPROVED" || status === "REJECTED" ? new Date(submitted.getTime() + 6 * 864e5) : null,
    locked: status === "APPROVED" || status === "REJECTED",
  };
}

/** Demo staff for the workshop workflow (HOD, WP Committee chair and member). Password = SEED_ADMIN_PASSWORD. */
export const DEMO_STAFF = [
  { name: "Dr. Placeholder (HOD Critical Care)", email: "hod.criticalcare@lnh.edu.pk", role: "HOD", department: "Critical Care" },
  { name: "Dr. Placeholder (HOD Nursing)", email: "hod.nursing@lnh.edu.pk", role: "HOD", department: "Nursing" },
  { name: "Dr. Placeholder (WP Co-Chair)", email: "wp.chair@lnh.edu.pk", role: "WP_CHAIR", department: null },
  { name: "Dr. Placeholder (WP Member)", email: "wp.member@lnh.edu.pk", role: "WP_MEMBER", department: null },
] as const;
