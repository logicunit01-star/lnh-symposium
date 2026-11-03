import { and, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireDept } from "@/lib/dept";
import { PageTitle } from "@/components/admin/ui";
import { ApprovalTable } from "@/components/admin/ApprovalTable";
import { decideGuestReg } from "../../approvals-actions";

export const metadata = { title: "Guest approvals" };

/** Guests Registration Form 2027: the HOD signs off guests (speakers, chairs, moderators, panelists) of the department's sessions. */
export default async function DeptGuests({ searchParams }: { searchParams: { saved?: string } }) {
  const { deptName } = await requireDept("dept.guests");
  const rows = await db.select().from(s.registrations).where(and(eq(s.registrations.regType, "GUEST"), eq(s.registrations.department, deptName))).orderBy(desc(s.registrations.createdAt));
  const pending = rows.filter((r) => r.approvalStatus === "PENDING").length;
  return (
    <>
      <PageTitle title={`Guest approvals · ${deptName}`} sub={`Invited speakers, chairpersons, moderators and panelists who registered for your department's sessions. ${pending} awaiting your approval. Approval issues their complimentary pass.`} />
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Saved. The guest has been emailed.</p>}
      <ApprovalTable rows={rows} action={decideGuestReg} kind="GUEST" />
    </>
  );
}
