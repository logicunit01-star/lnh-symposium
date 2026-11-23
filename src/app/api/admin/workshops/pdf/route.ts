import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { apiUser, staffScope } from "@/lib/auth";
import { getEvent } from "@/lib/event";
import { WP_STATUSES, wpWorkshops } from "@/lib/wp";
import { workshopDetailPdf, workshopsListPdf } from "@/lib/pdf-workshops";
import { fmtDate, ymdPk } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Workshop details as PDF (LNH, 23 Nov 2026: for the Workshop Programme Chair).
 * ?id=<workshop> → that workshop's full details; otherwise every workshop in the console filter (status, week, dept, day).
 * Same visibility as the Workshop Programme console: committee roles see all departments, department staff their own.
 */
export async function GET(req: Request) {
  const u = await apiUser("workshops");
  if (!u) return new Response("Forbidden", { status: 403 });
  const sc = await staffScope(u);
  const q = new URL(req.url).searchParams;
  const ev = await getEvent();
  const all = await wpWorkshops(sc);
  const stamp = new Date().toISOString().slice(0, 10);
  const pdf = (bytes: Uint8Array, name: string) => new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" } });

  const id = q.get("id");
  if (id) {
    const r = all.find((x) => x.w.id === id);
    if (!r) return new Response("Not found", { status: 404 });
    const depts = (await db.select({ d: s.sessionDepartments.department }).from(s.sessionDepartments).where(eq(s.sessionDepartments.sessionId, r.w.id))).map((x) => x.d);
    const slug = r.w.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 50) || "workshop";
    return pdf(await workshopDetailPdf(r, { eventName: ev.name, departments: depts, weekLabel: r.w.themeWeek ? ev.themeWeeks[r.w.themeWeek - 1]?.label : null }), `workshop-${slug}-${stamp}.pdf`);
  }
  const status = WP_STATUSES.includes(q.get("status") as any) ? q.get("status")! : undefined;
  const week = Number(q.get("week")) || undefined;
  const dept = sc.all ? q.get("dept") || undefined : undefined;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(q.get("day") ?? "") ? q.get("day")! : undefined;
  const rows = all.filter((r) => (!status || r.w.status === status) && (!week || r.w.themeWeek === week) && (!dept || r.w.department === dept) && (!day || ymdPk(r.w.startsAt) === day));
  const filter = [status && `Status: ${status.replace("_", " ").toLowerCase()}`, week && `Week ${week}`, dept && `Department: ${dept}`, day && `Date: ${fmtDate(new Date(`${day}T12:00:00+05:00`), { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`,
    !sc.all && `Department view: ${sc.departments.join(", ")}`].filter(Boolean).join(" · ");
  return pdf(await workshopsListPdf(rows, { eventName: ev.name, filter: filter || "All workshops" }), `workshops-${stamp}.pdf`);
}
