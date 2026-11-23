import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { MANUAL } from "@/lib/manual";
import { PageTitle } from "@/components/admin/ui";
import { ManualView } from "@/components/admin/ManualView";

export const metadata = { title: "Training Manual" };

/** Training Manual (LNH, 23 Nov 2026): the complete user guide, for every staff login. */
export default async function TrainingManual() {
  const u = await currentUser();
  if (!u) redirect("/admin/login?next=/admin/manual");
  const chapters = MANUAL.map((c) => ({
    ...c,
    sections: c.sections.map((s) => ({ ...s, mine: !s.perm || (Array.isArray(s.perm) ? s.perm : [s.perm]).some((p) => can(u, p)) })),
  }));
  return (
    <div id="top">
      <PageTitle title="Training Manual" sub="The complete guide to the 9th LNH Symposium website and admin portal: every feature and setting, who uses it and how. Search for any word, or browse by chapter." />
      <ManualView chapters={chapters} allowed />
    </div>
  );
}
