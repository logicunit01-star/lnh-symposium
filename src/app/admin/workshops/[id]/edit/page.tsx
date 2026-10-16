import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm, staffScope } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formAContext } from "@/lib/wp-form";
import { PageTitle } from "@/components/admin/ui";
import { WorkshopForm } from "@/components/admin/WorkshopForm";
import { fmtTime24, ymdPk } from "@/lib/utils";

export default async function EditWorkshop({ params }: { params: { id: string } }) {
  const u = await requirePerm("workshops");
  const sc = await staffScope(u);
  const [w] = await db.select().from(s.sessions).where(eq(s.sessions.id, params.id));
  if (!w || w.type !== "WORKSHOP") notFound();
  const own = !sc.all && w.department === sc.department;
  if (!sc.all && !own) notFound();
  if (w.locked || !(can(u.role, "workshops.edit") || (own && can(u.role, "workshops.submit")))) redirect(`/admin/workshops/${w.id}?locked=1`);
  const c = await formAContext();
  return (
    <>
      <p className="mb-2 text-sm"><Link href={`/admin/workshops/${w.id}`} className="text-lnh-blue hover:underline">← Back to request</Link></p>
      <PageTitle title={`Edit: ${w.title}`} sub="Changes are logged in the request history." />
      <WorkshopForm venues={c.venues} weeks={c.weeks} window={c.window} departments={c.depts} fixedDepartment={sc.all ? null : sc.department}
        init={{ ...w, date: ymdPk(w.startsAt), start: fmtTime24(w.startsAt), end: fmtTime24(w.endsAt) }} />
    </>
  );
}
