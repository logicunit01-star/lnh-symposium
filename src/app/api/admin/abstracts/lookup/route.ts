import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { can, deptsWith } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Agenda form (SC feedback): entering an abstract ID fills in its title, presenting author and co-authors. Staff only. */
export async function GET(req: Request) {
  const u = await currentUser();
  if (!u || !(can(u, "dept.sessions") || can(u, "programme.edit"))) return Response.json({ error: "Not allowed" }, { status: 401 });
  const ref = (new URL(req.url).searchParams.get("ref") || "").trim().toUpperCase();
  if (!/^ABS-\d{4}-\d{3,}$/.test(ref)) return Response.json({ found: false });
  const [a] = await db.select().from(s.abstracts).where(eq(s.abstracts.refNo, ref));
  if (!a) return Response.json({ found: false, message: `${ref} was not found.` });
  // audit 16 Nov 2026: department staff see only accepted oral abstracts of their own departments (no other authors' contact details)
  if (!can(u, "programme.edit")) {
    const mine = deptsWith(u.depts, "dept.sessions");
    if (!mine.includes(a.specialty) && !mine.includes(a.assignedDept ?? "")) return Response.json({ found: false, message: `${ref} is not one of your department's abstracts.` });
    if (!(a.status === "ACCEPTED" && a.acceptedAs === "ORAL")) return Response.json({ found: false, message: `${ref} is not an accepted oral abstract.` });
  }
  const oral = a.status === "ACCEPTED" && a.acceptedAs === "ORAL";
  return Response.json({
    found: true, refNo: a.refNo, title: a.abstractTitle, author: a.presentingAuthor, email: a.email, phone: a.mobile, organization: a.organization,
    coAuthors: (a.coAuthors ?? []).map((c) => `${c.name} (${c.affiliation})`).join("; "), specialty: a.specialty, oral,
    message: oral ? null : `${a.refNo} is ${a.status === "ACCEPTED" ? "accepted as a poster" : a.status === "REJECTED" ? "rejected" : "still under review"}; only accepted oral abstracts can be presented in a session.`,
  });
}
