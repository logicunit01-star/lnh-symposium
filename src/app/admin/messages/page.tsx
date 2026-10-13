import { desc } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PageTitle, Empty } from "@/components/admin/ui";
import { fmtDateTime } from "@/lib/utils";
import { toggleMessage } from "../actions";

export default async function Messages() {
  await requirePerm("messages");
  const rows = await db.select().from(s.contactMessages).orderBy(desc(s.contactMessages.createdAt)).limit(200);
  return (
    <>
      <PageTitle title="Enquiries" sub={`${rows.filter((r) => !r.handled).length} open`} />
      <div className="space-y-3">
        {rows.map((m) => (
          <div key={m.id} className={`a-card p-5 ${m.handled ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-semibold">{m.subject}</p><p className="text-xs text-slate-500">{m.name} · <a className="text-lnh-blue" href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}>{m.email}</a>{m.phone ? ` · ${m.phone}` : ""} · {fmtDateTime(m.createdAt)}</p></div>
              <form action={toggleMessage.bind(null, m.id, !m.handled)}><button className="a-btn-ghost text-xs">{m.handled ? "Re-open" : "Mark handled"}</button></form>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{m.message}</p>
          </div>
        ))}
        {!rows.length && <div className="a-card"><Empty>No enquiries yet.</Empty></div>}
      </div>
    </>
  );
}
