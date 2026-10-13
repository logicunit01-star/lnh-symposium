import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import { SessionForm } from "@/components/admin/SessionForm";
export default async function EditSession({ params }: { params: { id: string } }) {
  await requirePerm("sessions.edit");
  const x = await db.query.sessions.findFirst({ where: eq(s.sessions.id, params.id), with: { speakers: true } });
  if (!x) notFound();
  return <><PageTitle title="Edit session" sub={x.title} /><SessionForm session={x} assigned={x.speakers} /></>;
}
