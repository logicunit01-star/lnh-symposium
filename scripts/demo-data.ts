// Optional: fills the database with FAKE registrations, abstracts and feedback for demos. Never run on production.
import { eq, inArray } from "drizzle-orm";
import { db, schema as s } from "../src/lib/db";
import { nextNumber, pad } from "../src/lib/counters";

const first = ["Ali", "Sana", "Hamza", "Ayesha", "Usman", "Fatima", "Bilal", "Zara", "Imran", "Mahnoor", "Saad", "Hira", "Fahad", "Iqra", "Kashif", "Amna"];
const last = ["Khan", "Ahmed", "Siddiqui", "Hussain", "Raza", "Malik", "Qureshi", "Shaikh", "Baig", "Iqbal"];
const inst = ["Liaquat National Hospital", "Dow University", "Aga Khan University Hospital", "Jinnah Postgraduate Medical Centre", "Ziauddin University", "Civil Hospital Karachi", "Indus Hospital"];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

async function main() {
  const cats = await db.select().from(s.feeCategory);
  const sess = await db.select().from(s.sessions).where(eq(s.sessions.registrable, true));
  for (let i = 0; i < 120; i++) {
    const cat = pick(cats);
    const chosen = [...new Set(Array.from({ length: Math.floor(Math.random() * 3) }, () => pick(sess)))];
    const items = chosen.map((x) => ({ sessionId: x.id, fee: x.earlyFee ?? x.fee }));
    const total = cat.earlyFee + items.reduce((a, b) => a + b.fee, 0);
    const st = Math.random() < 0.7 ? "PAID" : Math.random() < 0.85 ? "PENDING" : "WAIVED";
    const fn = pick(first), ln = pick(last);
    const created = new Date(Date.now() - Math.random() * 28 * 864e5);
    const [r] = await db.insert(s.registrations).values({
      regNo: `LNH27-${pad(await nextNumber("reg-27"))}`, accessToken: crypto.randomUUID().replace(/-/g, ""), title: pick(["Dr.", "Dr.", "Prof.", "Mr.", "Ms."]), gender: pick(["Male", "Female"]),
      firstName: fn, lastName: ln, email: `${fn}.${ln}${i}@example.com`.toLowerCase(), phone: `03${Math.floor(10 + Math.random() * 40)}-${Math.floor(1e6 + Math.random() * 9e6)}`,
      institution: pick(inst), city: "Karachi", categoryId: cat.id, conferenceFee: cat.earlyFee, totalFee: total, earlyBird: true,
      paymentStatus: st as any, paymentMethod: st === "PAID" ? pick(["mock", "Bank transfer", "Cash at desk"]) : null, paidAt: st === "PAID" ? created : null, createdAt: created,
    }).returning();
    if (items.length) await db.insert(s.registrationItems).values(items.map((x) => ({ ...x, registrationId: r.id })));
  }
  const titles = ["Cost of diagnostic imaging in a tertiary care hospital", "Impact of an early warning score on ICU transfers", "Telemedicine follow-up for diabetic patients in Karachi", "Out-of-pocket expenditure on cancer care", "Hand hygiene compliance after a QI intervention", "Use of AI for chest X-ray triage", "Patient satisfaction with e-prescriptions", "Medication errors in paediatric wards"];
  for (let i = 0; i < 24; i++) {
    const type = Math.random() < 0.5 ? "ORAL" : "POSTER";
    await db.insert(s.abstracts).values({
      refNo: `ABS27-${type === "ORAL" ? "O" : "P"}${pad(await nextNumber("abs-27"), 3)}`, type: type as any, title: "Dr.", gender: pick(["Male", "Female"]), firstName: pick(first), lastName: pick(last),
      organization: pick(inst), department: pick(["Medicine", "Surgery", "Community Medicine", "Radiology", "Nursing"]), city: "Karachi", country: "Pakistan", mobile: "0300-1234567", email: `author${i}@example.com`,
      specialty: pick(["Health Economics", "Internal Medicine", "Radiology", "Nursing", "Health Informatics / IT"]), authors: "A. Author; B. Author; C. Author", presentingAuthor: "A. Author",
      abstractTitle: pick(titles), body: "Introduction: Placeholder text for demo purposes.\n\nMethods: A cross-sectional study.\n\nResults: Demo results.\n\nConclusions: Demo conclusion.", wordCount: 22,
      status: pick(["SUBMITTED", "SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"]) as any,
    });
  }
  const all = await db.select().from(s.sessions).where(inArray(s.sessions.type, ["KEYNOTE", "PLENARY", "WORKSHOP", "SCIENTIFIC", "PANEL"]));
  for (const x of all) {
    const n = 5 + Math.floor(Math.random() * 25);
    await db.insert(s.feedback).values(Array.from({ length: n }, () => {
      const base = 3 + Math.floor(Math.random() * 3);
      const v = () => Math.max(1, Math.min(5, base + Math.floor(Math.random() * 3) - 1));
      return { sessionId: x.id, overall: v(), content: v(), speaker: v(), organization: v(), relevance: v(), recommend: Math.random() < 0.85, comments: Math.random() < 0.3 ? pick(["Excellent session!", "Very practical, thank you.", "More time for Q&A please.", "Great speakers.", "Hall was too cold."]) : null };
    }));
  }
  console.log("Demo data added.");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
