import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { getEvent } from "@/lib/event";
import { acceptedOralFor, templateFiles } from "@/lib/programme";
import { PageTitle } from "@/components/admin/ui";
import { SessionProposalForm } from "@/components/admin/SessionProposalForm";

export default async function NewProposal({ searchParams }: { searchParams: { format?: string } }) {
  await requirePerm("programme.edit");
  const ev = await getEvent();
  const special = searchParams.format === "PLENARY" || searchParams.format === "DEBATE" ? searchParams.format : null;
  const depts = await db.select({ name: s.departments.name }).from(s.departments).where(eq(s.departments.active, true)).orderBy(asc(s.departments.name));
  return (
    <>
      <p className="mb-2 text-sm"><Link href="/admin/programme" className="text-lnh-blue hover:underline">← Scientific programme</Link></p>
      <PageTitle title="New scientific session" sub="Enter a session on behalf of a department, or set up the plenary (Day 1, 11:00–13:00) and debate (Day 2, 11:00–13:00) sessions with their keynote speaker, panelists and moderator." />
      <SessionProposalForm slots={ev.sessionSlots} departments={depts.map((d) => d.name)} fixedDept={null} templates={ev.agendaTemplates} templateFiles={await templateFiles()} acceptedOral={await acceptedOralFor(null)}
        init={special ? { sessionFormat: special, preferredSlots: ev.sessionSlots.filter((x) => x.special === special).map((x) => x.key) } : undefined} />
    </>
  );
}
