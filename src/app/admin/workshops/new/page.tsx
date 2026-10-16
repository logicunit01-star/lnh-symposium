import Link from "next/link";
import { requirePerm, staffScope } from "@/lib/auth";
import { formAContext } from "@/lib/wp-form";
import { PageTitle } from "@/components/admin/ui";
import { WorkshopForm } from "@/components/admin/WorkshopForm";

export const metadata = { title: "New workshop request" };

export default async function NewWorkshop() {
  const u = await requirePerm("workshops.submit");
  const sc = await staffScope(u);
  const c = await formAContext();
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/workshops" className="text-lnh-blue hover:underline">← Workshop Programme</Link></p>
      <PageTitle title="Workshop request · Form A" sub="Workshop Directors submit each request once. The committee reviews it; after approval the same record makes the catalogue card, the flyer and the daily requirements sheet." />
      <WorkshopForm venues={c.venues} weeks={c.weeks} window={c.window} departments={c.depts} fixedDepartment={sc.all ? null : sc.department} />
    </>
  );
}
