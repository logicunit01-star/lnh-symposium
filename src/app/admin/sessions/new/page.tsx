import { requirePerm } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import { SessionForm } from "@/components/admin/SessionForm";
export default async function NewSession({ searchParams }: { searchParams: { err?: string } }) {
  await requirePerm("sessions.edit");
  return <><PageTitle title="New session" sub="Keynotes, plenaries, ceremonies and breaks. Workshops are requested through Workshop Programme (Form A); department scientific sessions through the Scientific Programme." />{searchParams.err && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{searchParams.err}</p>}<SessionForm /></>;
}
