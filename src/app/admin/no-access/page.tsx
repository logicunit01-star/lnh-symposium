import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/permissions";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "No access yet" };

/** A signed-in login whose role and departments give no section (e.g. department staff not yet linked to a department). */
export default async function NoAccess() {
  const u = await currentUser();
  if (!u) redirect("/admin/login");
  if (homeFor(u) !== "/admin/no-access") redirect(homeFor(u));
  return (
    <>
      <PageTitle title="No access yet" sub={`Signed in as ${u.email}.`} />
      <p className="a-card p-6 text-sm text-slate-600">Your login is not linked to a department or a role with access yet. Please ask the Super Admin to add you to your department in Users &amp; roles.</p>
    </>
  );
}
