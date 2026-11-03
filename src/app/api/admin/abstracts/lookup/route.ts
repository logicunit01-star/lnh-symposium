import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

/** Agenda form (SC feedback): entering an abstract ID fills in its title, presenting author and co-authors. Staff only. */
export async function GET(req: Request) {
  const u = await currentUser();
  if (!u || !(can(u.role, "dept.sessions") || can(u.role, "programme.edit"))) return Response.json({ error: "Not allowed" }, { status: 401 });
  const ref = (new URL(req.url).searchParams.get("ref") || "").trim().toUpperCase();
  if (!/^ABS-\d{4}-\d{3,}$/.test(ref)) return Response.json({ found: false });
  const [a] = await db.select().from(s.abstracts).where(eq(s.abstracts.refNo, ref));
  if (!a) return Response.json({ found: false, message: `${ref} was not found.` });
  const oral = a.status === "ACCEPTED" && a.acceptedAs === "ORAL";
  return Response.json({
    found: true, refNo: a.refNo, title: a.abstractTitle, author: a.presentingAuthor, email: a.email, phone: a.mobile, organization: a.organization,
    coAuthors: (a.coAuthors ?? []).map((c) => `${c.name} (${c.affiliation})`).join("; "), specialty: a.specialty, oral,
    message: oral ? null : `${a.refNo} is ${a.status === "ACCEPTED" ? "accepted as a poster" : a.status === "REJECTED" ? "rejected" : "still under review"}; only accepted oral abstracts can be presented in a session.`,
  });
}
