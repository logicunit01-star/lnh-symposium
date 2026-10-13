import { asc } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { PageTitle } from "@/components/admin/ui";
import { Avatar } from "@/components/ui/Avatar";
import { saveSpeaker, deleteSpeaker, saveMember, deleteMember } from "../actions";
import type { Speaker } from "@/lib/db/schema";

function SpeakerFields({ x }: { x?: Speaker }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <div><label className="a-label">Title</label><input name="title" defaultValue={x?.title ?? "Dr."} className="a-input" /></div>
      <div className="sm:col-span-3"><label className="a-label">Name *</label><input name="name" required defaultValue={x?.name} className="a-input" /></div>
      <div className="sm:col-span-2"><label className="a-label">Designation</label><input name="designation" defaultValue={x?.designation ?? ""} className="a-input" /></div>
      <div className="sm:col-span-2"><label className="a-label">Institution</label><input name="institution" defaultValue={x?.institution ?? ""} className="a-input" /></div>
      <div><label className="a-label">Country</label><input name="country" defaultValue={x?.country ?? "Pakistan"} className="a-input" /></div>
      <div className="sm:col-span-3"><label className="a-label">Topic</label><input name="topic" defaultValue={x?.topic ?? ""} className="a-input" /></div>
      <div className="sm:col-span-4"><label className="a-label">Bio</label><textarea name="bio" rows={3} defaultValue={x?.bio ?? ""} className="a-input" /></div>
      <div className="sm:col-span-2"><label className="a-label">Photo URL</label><input name="photoUrl" defaultValue={x?.photoUrl ?? ""} placeholder="https://… or /speakers/name.jpg" className="a-input" /></div>
      <div className="sm:col-span-2"><label className="a-label">LinkedIn URL</label><input name="linkedin" defaultValue={x?.linkedin ?? ""} className="a-input" /></div>
      <div><label className="a-label">Order</label><input name="order" type="number" defaultValue={x?.order ?? 0} className="a-input" /></div>
      <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="featured" defaultChecked={x?.featured} /> Featured on homepage</label>
    </div>
  );
}

export default async function Content() {
  await requirePerm("content");
  const [speakers, members] = await Promise.all([
    db.select().from(s.speakers).orderBy(asc(s.speakers.order), asc(s.speakers.name)),
    db.select().from(s.committee).orderBy(asc(s.committee.order)),
  ]);
  return (
    <>
      <PageTitle title="Speakers & committee" sub="Changes appear on the website immediately. Tip: upload photos to /public/speakers and use /speakers/filename.jpg." />
      <section className="mb-10">
        <h2 className="mb-3 font-display text-lg font-bold">Speakers ({speakers.length})</h2>
        <details className="a-card mb-3 p-4"><summary className="cursor-pointer text-sm font-semibold text-lnh-blue">+ Add speaker</summary>
          <form action={saveSpeaker.bind(null, null)} className="mt-4 space-y-3"><SpeakerFields /><button className="a-btn-primary">Add speaker</button></form>
        </details>
        <div className="space-y-2">{speakers.map((x) => (
          <details key={x.id} className="a-card group p-4">
            <summary className="flex cursor-pointer list-none items-center gap-3">
              <Avatar name={x.name} src={x.photoUrl} className="h-10 w-10 rounded-full text-[7px]" />
              <div className="flex-1"><p className="font-semibold">{x.title} {x.name} {x.featured && <span className="badge ml-1 bg-rose-100 text-rose-700">Featured</span>}</p><p className="text-xs text-slate-500">{x.designation} · {x.institution}</p></div>
              <span className="text-xs text-lnh-blue group-open:hidden">Edit</span>
            </summary>
            <form action={saveSpeaker.bind(null, x.id)} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <SpeakerFields x={x} />
              <div className="flex justify-between"><button className="a-btn-primary">Save</button><button formAction={deleteSpeaker.bind(null, x.id)} className="a-btn-ghost text-rose-600">Delete</button></div>
            </form>
          </details>
        ))}</div>
      </section>
      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Organizing committee ({members.length})</h2>
        <div className="a-card overflow-x-auto">
          <table className="a-table">
            <thead><tr><th>Order</th><th>Group</th><th>Role</th><th>Name</th><th>Designation</th><th>Department</th><th>Photo URL</th><th /></tr></thead>
            <tbody>
              {[...members, null].map((m) => {
                const id = m ? m.id : "new";
                return (
                  <tr key={id}>
                    <td><input form={`m_${id}`} name="order" type="number" defaultValue={m?.order ?? members.length} className="a-input w-16" /></td>
                    <td><input form={`m_${id}`} name="group" defaultValue={m?.group ?? "Organizing Committee"} className="a-input" /></td>
                    <td><input form={`m_${id}`} name="role" required defaultValue={m?.role ?? ""} placeholder="Member" className="a-input" /></td>
                    <td><input form={`m_${id}`} name="name" required defaultValue={m?.name ?? ""} placeholder={m ? "" : "New member…"} className="a-input" /></td>
                    <td><input form={`m_${id}`} name="designation" defaultValue={m?.designation ?? ""} className="a-input" /></td>
                    <td><input form={`m_${id}`} name="department" defaultValue={m?.department ?? ""} className="a-input" /></td>
                    <td><input form={`m_${id}`} name="photoUrl" defaultValue={m?.photoUrl ?? ""} className="a-input" /></td>
                    <td className="whitespace-nowrap">
                      <form id={`m_${id}`} action={saveMember.bind(null, m?.id ?? null)} className="inline"><button className="a-btn-primary py-1.5 text-xs">{m ? "Save" : "Add"}</button></form>
                      {m && <form action={deleteMember.bind(null, m.id)} className="ml-1 inline"><button className="a-btn-ghost py-1.5 text-xs text-rose-600">✕</button></form>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
