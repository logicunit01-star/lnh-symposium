import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import { SessionForm } from "@/components/admin/SessionForm";
export default async function EditSession({ params, searchParams }: { params: { id: string }; searchParams: { err?: string } }) {
  await requirePerm("sessions.edit");
  const x = await db.query.sessions.findFirst({ where: eq(s.sessions.id, params.id), with: { speakers: true } });
  if (!x) notFound();
  // audit 16 Nov 2026: workshops and department sessions have their own editors (locks, multi-day, agenda deadline)
  if (x.type === "WORKSHOP") redirect(`/admin/workshops/${x.id}/edit`);
  if (x.proposal) redirect(`/admin/programme/${x.id}`);
  return <><PageTitle title="Edit session" sub={x.title} />{searchParams.err && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{searchParams.err}</p>}<SessionForm session={x} assigned={x.speakers} /></>;
}
