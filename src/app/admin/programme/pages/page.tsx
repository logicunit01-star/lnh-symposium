import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { getEvent } from "@/lib/event";
import { getProgrammePage, PAGE_PATH, type PageKey } from "@/lib/programme-pages";
import { PageTitle } from "@/components/admin/ui";
import { Avatar } from "@/components/ui/Avatar";
import { deleteGuest, saveGuest, savePage } from "./actions";

export const metadata = { title: "Programme pages" };
export const dynamic = "force-dynamic";

const MSG: Record<string, string> = { name: "Enter the guest's name.", "photo-type": "The photo must be a JPG, PNG or WebP image.", "photo-size": "The photo must be 1 MB or smaller." };
const SAVED: Record<string, string> = { page: "Page saved.", guest: "Guest saved.", deleted: "Guest removed." };

function GuestFields({ g }: { g?: { name: string; affiliation: string | null; qualification: string | null; topic: string | null; order: number } & { photoUrl?: string | null } }) {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-2"><label className="a-label">Name *</label><input name="name" required defaultValue={g?.name ?? ""} className="a-input" placeholder="Prof. Dr. …" /></div>
      <div className="sm:col-span-2"><label className="a-label">Affiliation</label><input name="affiliation" defaultValue={g?.affiliation ?? ""} className="a-input" /></div>
      <div className="sm:col-span-2"><label className="a-label">Qualification</label><input name="qualification" defaultValue={g?.qualification ?? ""} className="a-input" placeholder="MBBS, FCPS, PhD" /></div>
      <div className="sm:col-span-3"><label className="a-label">Topic / role (optional)</label><input name="topic" defaultValue={g?.topic ?? ""} className="a-input" /></div>
      <div className="sm:col-span-2"><label className="a-label">Photograph (JPG, PNG or WebP, max 1 MB)</label><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="a-input" /></div>
      <div className="sm:col-span-1"><label className="a-label">Order</label><input name="order" type="number" defaultValue={g?.order ?? 0} className="a-input" /></div>
      <div className="sm:col-span-6"><label className="a-label">…or photo URL</label><input name="photoUrl" defaultValue={g?.photoUrl ?? ""} className="a-input" placeholder="https://…" /></div>
    </div>
  );
}

async function PageCard({ k }: { k: PageKey }) {
  const { page, guests } = await getProgrammePage(k);
  const ev = await getEvent();
  const live = page.published && (k !== "EXPERTS" || !!ev.programmeReleasedAt);
  return (
    <section id={k} className="a-card scroll-mt-24 space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">{page.title}</h2>
        <div className="flex items-center gap-2 text-xs">
          <span className={live ? "badge bg-emerald-100 text-emerald-700" : "badge bg-slate-100 text-slate-600"}>{live ? "Public" : page.published && k === "EXPERTS" ? "Published · shows after the programme is released" : "Not public"}</span>
          <Link href={`${PAGE_PATH[k]}?preview=1`} target="_blank" className="a-btn-ghost text-xs">Preview</Link>
        </div>
      </div>
      <form action={savePage.bind(null, k)} className="grid gap-3 sm:grid-cols-2">
        <div><label className="a-label">Page title</label><input name="title" defaultValue={page.title} className="a-input" /></div>
        <div><label className="a-label">Date and time</label><input name="dateText" defaultValue={page.dateText ?? ""} className="a-input" placeholder="e.g. Saturday 16 January 2027, 7:00–8:30 pm (online)" /></div>
        <div className="sm:col-span-2"><label className="a-label">Programme format</label><textarea name="format" rows={3} defaultValue={page.format ?? ""} className="a-input" placeholder="e.g. Online panel discussion · 4 panelists · moderated Q&A" /></div>
        <div className="sm:col-span-2"><label className="a-label">Description (optional)</label><textarea name="description" rows={3} defaultValue={page.description ?? ""} className="a-input" /></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="published" defaultChecked={page.published} />Publish on the website{k === "EXPERTS" ? " (guests appear once the programme is released)" : ""}</label>
        <div className="sm:col-span-2"><button className="a-btn-primary">Save page</button></div>
      </form>
      <div>
        <h3 className="mb-3 font-semibold">Guests ({guests.length})</h3>
        <div className="space-y-3">
          {guests.map((g) => (
            <details key={g.id} className="rounded-xl border border-slate-200 p-4">
              <summary className="flex cursor-pointer items-center gap-3"><Avatar name={g.name} src={g.photo} className="h-10 w-10 rounded-full text-[7px]" /><span><b>{g.name}</b><span className="block text-xs text-slate-500">{[g.qualification, g.affiliation].filter(Boolean).join(" · ")}</span></span></summary>
              <form action={saveGuest.bind(null, k, g.id)} className="mt-4 space-y-3">
                <GuestFields g={{ ...g, photoUrl: g.photo?.startsWith("/api/") ? "" : g.photo }} />
                {g.photo?.startsWith("/api/") && <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="removePhoto" />Remove the uploaded photo</label>}
                <button className="a-btn-primary">Save guest</button>
              </form>
              <form action={deleteGuest.bind(null, k, g.id)} className="mt-2"><button className="text-xs text-rose-600 underline">Remove guest</button></form>
            </details>
          ))}
        </div>
        <form action={saveGuest.bind(null, k, null)} className="mt-4 space-y-3 rounded-xl border border-dashed border-slate-300 p-4">
          <p className="text-sm font-semibold">Add a guest</p>
          <GuestFields />
          <button className="a-btn-ghost">Add guest</button>
        </form>
      </div>
    </section>
  );
}

export default async function ProgrammePages({ searchParams }: { searchParams: { saved?: string; err?: string } }) {
  await requirePerm("programme.edit");
  return (
    <>
      <PageTitle title="Programme pages" sub="Pre-Symposium Webinar / Panel Discussion and Meet the Experts: programme format and guests (photograph, name, affiliation, qualification). Plenary, Debate and Scientific Sessions pages fill in from the approved programme." />
      {searchParams.err && <p className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{MSG[searchParams.err] ?? "Could not save."}</p>}
      {searchParams.saved && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{SAVED[searchParams.saved] ?? "Saved."}</p>}
      <div className="space-y-6"><PageCard k="WEBINAR" /><PageCard k="EXPERTS" /></div>
    </>
  );
}
