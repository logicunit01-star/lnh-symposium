import { desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import { ApprovalTable } from "@/components/admin/ApprovalTable";
import { decideVolunteer } from "../approvals-actions";

export const metadata = { title: "Volunteers" };

/** Volunteers Registration Form 2027: signed off by the Chairperson, Facilitation Committee. */
export default async function Volunteers({ searchParams }: { searchParams: { saved?: string } }) {
  await requirePerm("volunteers");
  const rows = await db.select().from(s.registrations).where(eq(s.registrations.regType, "VOLUNTEER")).orderBy(desc(s.registrations.createdAt));
  const by = (k: string) => rows.filter((r) => r.approvalStatus === k).length;
  return (
    <>
      <PageTitle title="Volunteers" sub={`${by("PENDING")} awaiting approval · ${by("APPROVED")} approved · ${by("REJECTED")} declined. Approval issues the volunteer pass.`} />
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved. The volunteer has been emailed.</p>}
      <ApprovalTable rows={rows} action={decideVolunteer} kind="VOLUNTEER" />
    </>
  );
}
