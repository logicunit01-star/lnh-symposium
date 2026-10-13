import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(req: Request) {
  if (!(await apiUser("registrations"))) return new Response("Forbidden", { status: 403 });
  const sessionId = new URL(req.url).searchParams.get("session");
  const regs = await db.query.registrations.findMany({ orderBy: asc(s.registrations.createdAt), with: { category: true, items: { with: { session: true } } } });
  const rows = regs.filter((r) => !sessionId || r.items.some((i) => i.sessionId === sessionId)).map((r) => ({
    RegNo: r.regNo, Title: r.title, FirstName: r.firstName, LastName: r.lastName, Gender: r.gender, Email: r.email, Phone: r.phone,
    PMDC: r.pmdcNo, Specialty: r.specialty, Designation: r.designation, Institution: r.institution, City: r.city, Address: r.address,
    Category: r.category.label, ConferenceFee: r.conferenceFee, TotalFee: r.totalFee, EarlyBird: r.earlyBird ? "Yes" : "No",
    PaymentStatus: r.paymentStatus, PaymentMethod: r.paymentMethod, PaidAt: r.paidAt, CheckedIn: r.checkedInAt, Certificate: r.certificateNo,
    Sessions: r.items.map((i) => i.session.title).join(" | "), RegisteredAt: r.createdAt,
    ...(sessionId ? { AttendedSession: r.items.find((i) => i.sessionId === sessionId)?.attendedAt ?? "" } : {}),
  }));
  return csvResponse(`registrations${sessionId ? "-session" : ""}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
}
