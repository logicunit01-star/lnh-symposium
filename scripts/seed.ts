// Seeds settings, fee categories, the first admin user and DUMMY content (edit everything from /admin).
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, schema as s } from "../src/lib/db";

const D = (x: string) => new Date(x); // ISO with +05:00 (PKT)

async function main() {
  await db.insert(s.event).values({
    id: 1,
    edition: "9th",
    name: "9th LNH Symposium 2027",
    theme: "Healthcare Conundrum: Cost, Quality & Technology",
    tagline: "Where evidence meets economics — and technology bridges the gap.",
    startDate: D("2027-02-19T08:30:00+05:00"),
    endDate: D("2027-02-21T17:00:00+05:00"),
    venue: "Liaquat National Hospital & Medical College, Stadium Road, Karachi",
    earlyBirdUntil: D("2026-12-31T23:59:59+05:00"),
    abstractOpen: D("2026-10-01T00:00:00+05:00"),
    abstractDeadline: D("2026-12-15T23:59:59+05:00"),
    abstractWordLimit: 300,
    facebook: "https://www.facebook.com/",
    instagram: "https://www.instagram.com/",
    linkedin: "https://www.linkedin.com/",
    youtube: "https://www.youtube.com/",
    videos: [],
  }).onConflictDoNothing();

  await db.insert(s.feeCategory).values([
    { code: "FACULTY", label: "Consultants / Faculty", fee: 8000, earlyFee: 6000, order: 1 },
    { code: "MO", label: "Medical Officers / Residents / GPs", fee: 5000, earlyFee: 4000, order: 2 },
    { code: "NURSE", label: "Nurses & Allied Health", fee: 3000, earlyFee: 2500, order: 3 },
    { code: "STUDENT", label: "Students (valid ID required)", fee: 2000, earlyFee: 1500, order: 4, note: "Show a valid student ID at the registration desk." },
    { code: "LNH", label: "LNH Faculty & Staff", fee: 2500, earlyFee: 2000, order: 5 },
  ]).onConflictDoNothing();

  const email = process.env.SEED_ADMIN_EMAIL || "admin@lnh.edu.pk";
  const pw = process.env.SEED_ADMIN_PASSWORD || "ChangeMe!2026";
  await db.insert(s.users).values({ name: "Super Admin", email, passwordHash: await bcrypt.hash(pw, 10), role: "SUPER_ADMIN" }).onConflictDoNothing();

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.speakers);
  if (n > 0) { console.log("Content already present — skipped dummy content."); return; }

  // ---------- DUMMY speakers (fictional placeholders) ----------
  const sp: [string, string, string, string, string, boolean][] = [
    ["Prof.", "Ayesha Rahman", "Dean, Health Policy", "Karachi Institute of Health Sciences", "Value-based healthcare in low-resource settings", true],
    ["Dr.", "Omar Siddiqui", "Chief Medical Information Officer", "Metro Health Network", "AI at the bedside: from hype to workflow", true],
    ["Prof.", "Sara Mahmood", "Professor of Medicine", "LNH Medical College", "Quality indicators that actually change outcomes", true],
    ["Dr.", "James Whitfield", "Health Economist", "Global Health Economics Group", "Cost-effectiveness for clinicians", true],
    ["Prof.", "Farhan Ali", "Director, Patient Safety", "LNH Medical College", "Building a just culture", true],
    ["Dr.", "Hina Qureshi", "Consultant Radiologist", "Liaquat National Hospital", "Imaging stewardship & cost", true],
    ["Dr.", "Bilal Ahmed", "Head of Digital Health", "Pakistan Telehealth Forum", "Telemedicine at scale", false],
    ["Prof.", "Nadia Kareem", "Professor of Community Medicine", "Sindh Public Health Institute", "Universal health coverage: the Pakistan path", false],
    ["Dr.", "Usman Tariq", "Consultant Intensivist", "Liaquat National Hospital", "Critical care: costs at the edge", false],
    ["Dr.", "Maria Fernandes", "Quality & Accreditation Lead", "Healthcare Accreditation Advisors", "Accreditation as a quality engine", false],
    ["Dr.", "Zain Haider", "Data Scientist", "LNH Research Unit", "Real-world data for decisions", false],
    ["Prof.", "Rukhsana Begum", "Director Nursing", "LNH College of Nursing", "Nursing-sensitive quality metrics", false],
  ];
  const speakerRows = await db.insert(s.speakers).values(sp.map(([title, name, designation, institution, topic, featured], i) => ({
    title, name, designation, institution, topic, featured, order: i, linkedin: "https://www.linkedin.com/",
    bio: `${title} ${name} is ${designation.toLowerCase()} at ${institution}, with interests in health systems, quality improvement and evidence-based practice. (Placeholder bio — replace from the admin panel.)`,
  }))).returning({ id: s.speakers.id });

  // ---------- DUMMY committee ----------
  const cm = [
    ["Patron-in-Chief", "Prof. Placeholder Name", "Chief Executive Officer", "Administration", "Patrons"],
    ["Patron", "Prof. Placeholder Name", "Principal, LNH&MC", "Medical College", "Patrons"],
    ["Chairperson", "Prof. Placeholder Name", "Director Academics", "Medical Education", "Organizing Committee"],
    ["Co-Chair", "Dr. Placeholder Name", "Head of Department", "Medicine", "Organizing Committee"],
    ["Secretary", "Dr. Placeholder Name", "Associate Professor", "Community Medicine", "Organizing Committee"],
    ["Member", "Dr. Placeholder Name", "Assistant Professor", "Surgery", "Organizing Committee"],
    ["Member", "Dr. Placeholder Name", "Consultant", "Paediatrics", "Organizing Committee"],
    ["Member", "Ms. Placeholder Name", "Manager", "Information Technology", "Organizing Committee"],
    ["Chair", "Prof. Placeholder Name", "Professor", "Research Unit", "Scientific Committee"],
    ["Member", "Dr. Placeholder Name", "Associate Professor", "Pathology", "Scientific Committee"],
    ["Member", "Dr. Placeholder Name", "Assistant Professor", "Biostatistics", "Scientific Committee"],
    ["Lead", "Mr. Placeholder Name", "Manager Events", "Corporate Communications", "Logistics"],
  ];
  await db.insert(s.committee).values(cm.map(([role, name, designation, department, group], i) => ({ role, name, designation, department, group, order: i })));

  // ---------- DUMMY programme ----------
  const t = (day: number, hm: string) => D(`2027-02-${18 + day}T${hm}:00+05:00`);
  type X = { day: number; s: string; e: string; type: any; title: string; hall: string; desc?: string; sp?: number[]; track?: string; reg?: boolean; cap?: number; fee?: number; efee?: number; cme?: number };
  const prog: X[] = [
    { day: 1, s: "08:30", e: "09:30", type: "CEREMONY", title: "Registration & Breakfast", hall: "Main Foyer" },
    { day: 1, s: "09:30", e: "10:30", type: "CEREMONY", title: "Inaugural Ceremony", hall: "Auditorium", desc: "Recitation, welcome address and opening remarks by the Patron-in-Chief." },
    { day: 1, s: "10:30", e: "11:15", type: "KEYNOTE", title: "Keynote: The True Cost of Care", hall: "Auditorium", sp: [0], track: "Cost", desc: "Why healthcare costs keep rising, who carries them, and what clinicians can change tomorrow." },
    { day: 1, s: "11:15", e: "11:45", type: "BREAK", title: "Tea Break & Poster Viewing", hall: "Exhibition Hall" },
    { day: 1, s: "11:45", e: "13:15", type: "PLENARY", title: "Plenary I — Financing Healthcare in Pakistan", hall: "Auditorium", sp: [7, 3, 8], track: "Cost", reg: true, cap: 400, desc: "Public financing, insurance schemes and out-of-pocket spending — what the evidence says." },
    { day: 1, s: "14:15", e: "15:45", type: "SCIENTIFIC", title: "Scientific Session A — Oral Abstracts (Health Economics)", hall: "Hall B", sp: [3], track: "Cost", reg: true, cap: 150, desc: "Selected oral presentations judged by the scientific committee." },
    { day: 1, s: "16:00", e: "17:00", type: "PANEL", title: "Panel: Who Pays? Insurance, Out-of-Pocket & the Middle Class", hall: "Auditorium", sp: [7, 0, 6], track: "Cost" },
    { day: 2, s: "09:00", e: "09:45", type: "KEYNOTE", title: "Keynote: Measuring What Matters", hall: "Auditorium", sp: [2], track: "Quality", desc: "Outcome measures, patient-reported outcomes and dashboards that drive change." },
    { day: 2, s: "09:45", e: "11:15", type: "PLENARY", title: "Plenary II — Patient Safety & Just Culture", hall: "Auditorium", sp: [4, 9, 11], track: "Quality", reg: true, cap: 400 },
    { day: 2, s: "11:15", e: "11:45", type: "BREAK", title: "Tea Break & Poster Judging", hall: "Exhibition Hall" },
    { day: 2, s: "11:45", e: "13:15", type: "SCIENTIFIC", title: "Scientific Session B — Oral Abstracts (Quality & Safety)", hall: "Hall B", sp: [4], track: "Quality", reg: true, cap: 150 },
    { day: 2, s: "14:00", e: "17:00", type: "WORKSHOP", title: "Quality Improvement Toolkit (PDSA, RCA, FMEA)", hall: "Skills Lab 1", sp: [4, 9], track: "Quality", reg: true, cap: 35, fee: 3000, efee: 2500, cme: 3, desc: "Hands-on workshop covering PDSA cycles, root-cause analysis and FMEA with real hospital case studies." },
    { day: 2, s: "14:00", e: "17:00", type: "WORKSHOP", title: "Research Methodology & Biostatistics", hall: "Seminar Room 2", sp: [10], track: "Quality", reg: true, cap: 40, fee: 3000, efee: 2500, cme: 3, desc: "From research question to analysis plan — sample size, study design and common statistical pitfalls." },
    { day: 3, s: "09:00", e: "09:45", type: "KEYNOTE", title: "Keynote: AI at the Bedside", hall: "Auditorium", sp: [1], track: "Technology" },
    { day: 3, s: "09:45", e: "11:15", type: "PLENARY", title: "Plenary III — Digital Health, Telemedicine & Data", hall: "Auditorium", sp: [6, 10, 5], track: "Technology", reg: true, cap: 400 },
    { day: 3, s: "11:30", e: "13:00", type: "SCIENTIFIC", title: "Scientific Session C — Oral Abstracts (Health Technology)", hall: "Hall B", sp: [1], track: "Technology", reg: true, cap: 150 },
    { day: 3, s: "09:00", e: "13:00", type: "WORKSHOP", title: "AI & Large Language Models for Clinicians", hall: "IT Lab", sp: [1, 10], track: "Technology", reg: true, cap: 30, fee: 4000, efee: 3500, cme: 4, desc: "Practical, safe use of AI tools for literature review, documentation and decision support. Laptops required." },
    { day: 3, s: "09:00", e: "13:00", type: "WORKSHOP", title: "Point-of-Care Ultrasound (POCUS) Essentials", hall: "Skills Lab 2", sp: [5, 8], track: "Technology", reg: true, cap: 25, fee: 5000, efee: 4500, cme: 4, desc: "Hands-on scanning stations: lungs, FAST, IVC and cardiac basics." },
    { day: 3, s: "14:00", e: "16:00", type: "WORKSHOP", title: "Health Economics for Clinicians", hall: "Seminar Room 1", sp: [3, 0], track: "Cost", reg: true, cap: 40, fee: 3000, efee: 2500, cme: 2, desc: "Cost-effectiveness, QALYs and budget-impact analysis explained for practising clinicians." },
    { day: 3, s: "16:00", e: "17:00", type: "CEREMONY", title: "Awards & Closing Ceremony", hall: "Auditorium", desc: "Best oral & poster presentation awards, vote of thanks." },
  ];
  const slugify = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
  for (const x of prog) {
    const [row] = await db.insert(s.sessions).values({
      slug: `d${x.day}-${slugify(x.title)}`, type: x.type, title: x.title, description: x.desc, track: x.track, day: x.day,
      startsAt: t(x.day, x.s), endsAt: t(x.day, x.e), hall: x.hall, capacity: x.cap ?? null, fee: x.fee ?? 0, earlyFee: x.efee ?? null,
      registrable: !!x.reg, cmeHours: x.cme ?? null,
    }).returning({ id: s.sessions.id });
    if (x.sp?.length) {
      await db.insert(s.sessionSpeakers).values(x.sp.map((i, k) => ({
        sessionId: row.id, speakerId: speakerRows[i].id,
        role: x.type === "PANEL" ? (k === 0 ? "Moderator" : "Panelist") : x.type === "WORKSHOP" ? "Facilitator" : "Speaker",
      })));
    }
  }
  console.log("Seed complete.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
