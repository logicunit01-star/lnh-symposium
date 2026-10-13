import { requirePerm } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import { SessionForm } from "@/components/admin/SessionForm";
export default async function NewSession() {
  await requirePerm("sessions.edit");
  return <><PageTitle title="New session / workshop" /><SessionForm /></>;
}
