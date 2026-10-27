import { and, asc, eq, ilike, or } from "drizzle-orm";
import { BookOpen, Search } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { getEvent } from "@/lib/event";
import { currentUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHero } from "@/components/ui/PageHero";
import { Alert } from "@/components/ui/Field";
import { SECTIONS } from "@/lib/scientific";
import { slotOf } from "@/lib/programme";
import { slotLabel } from "@/lib/scientific";

export const metadata = { title: "e-Abstract Book" };
export const dynamic = "force-dynamic";

export default async function AbstractBook({ searchParams }: { searchParams: { q?: string; dept?: string; preview?: string } }) {
  const ev = await getEvent();
  const staff = await currentUser();
  const preview = !!searchParams.preview && can(staff?.role, "abstracts");
  const open = !!ev.programmeReleasedAt || preview;
  const q = (searchParams.q ?? "").trim();
  const rows = open ? await db.query.abstracts.findMany({
    where: and(eq(s.abstracts.status, "ACCEPTED"), searchParams.dept ? eq(s.abstracts.specialty, searchParams.dept) : undefined,
      q ? or(ilike(s.abstracts.refNo, `%${q}%`), ilike(s.abstracts.abstractTitle, `%${q}%`), ilike(s.abstracts.authors, `%${q}%`), ilike(s.abstracts.keywords, `%${q}%`)) : undefined),
    orderBy: [asc(s.abstracts.specialty), asc(s.abstracts.refNo)], with: { session: true },
  }) : [];
  const depts = [...new Set(rows.map((r) => r.specialty))];
  return (
    <>
      <PageHero eyebrow={ev.name} title={<>e-Abstract <span className="text-grad">book</span></>} sub={`${ev.mainTheme}. Accepted oral and poster abstracts, searchable by ID, title, author or keyword.`} />
      <div className="container-x">
        {!open ? <Alert kind="info">The e-abstract book will be published when the scientific programme is released.</Alert> : (
          <>
            {preview && !ev.programmeReleasedAt && <Alert kind="info" className="mb-6">Preview for the Scientific Committee; not yet public.</Alert>}
            <form className="hud mb-8 flex flex-wrap gap-3 p-4 print:hidden">
              <div className="relative min-w-[240px] flex-1"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input name="q" defaultValue={q} placeholder="Search ID, title, author or keyword" className="input pl-11" /></div>
              {preview && <input type="hidden" name="preview" value="1" />}
              <button className="btn-primary">Search</button>
            </form>
            <p className="mono mb-6 text-sm text-slate-400"><BookOpen className="mr-2 inline h-4 w-4" />{rows.length} abstract{rows.length === 1 ? "" : "s"}</p>
            {depts.map((d) => (
              <section key={d} className="mb-12">
                <h2 className="h-display mb-4 border-b border-white/10 pb-3 text-2xl text-white">{d}</h2>
                <div className="space-y-5">{rows.filter((r) => r.specialty === d).map((a) => {
                  const sl = a.session ? slotOf(ev.sessionSlots, a.session.slotKey) : null;
                  return (
                    <article key={a.id} id={a.refNo} className="card break-inside-avoid p-6">
                      <p className="mono text-xs text-lnh-sky">{a.refNo} · {a.acceptedAs === "POSTER" ? "Poster" : "Oral presentation"}{a.session ? ` · ${a.session.title}` : ""}{sl ? ` · ${slotLabel(sl)}` : ""}</p>
                      <h3 className="mt-2 font-display text-xl font-bold text-white">{a.abstractTitle}</h3>
                      <p className="mt-2 text-sm text-slate-300"><b>{a.presentingAuthor}</b> ({a.organization}){(a.coAuthors ?? []).map((c) => `, ${c.name} (${c.affiliation})`).join("")}</p>
                      <div className="mt-4 space-y-2 text-sm leading-relaxed text-slate-300">
                        {a.sections ? (SECTIONS[a.kind ?? "ORIGINAL"] ?? []).map(([k, l]) => a.sections?.[k] ? <p key={k}><b className="text-white">{l}:</b> {a.sections[k]}</p> : null) : <p className="whitespace-pre-wrap">{a.body}</p>}
                      </div>
                      {a.keywords && <p className="mt-3 text-xs text-slate-500">Keywords: {a.keywords}</p>}
                    </article>
                  );
                })}</div>
              </section>
            ))}
            {!rows.length && <p className="text-slate-400">No abstracts match.</p>}
          </>
        )}
      </div>
    </>
  );
}
