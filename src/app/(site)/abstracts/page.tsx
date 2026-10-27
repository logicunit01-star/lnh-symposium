import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { BookOpen, CalendarClock, FileText, Presentation, ShieldCheck } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { getEvent, abstractWindow } from "@/lib/event";
import { currentAccount } from "@/lib/account";
import { PageHero } from "@/components/ui/PageHero";
import { Alert } from "@/components/ui/Field";
import { fmtDate } from "@/lib/utils";
import { AbstractForm } from "./AbstractForm";

export const metadata = { title: "Abstract Submission" };
export const dynamic = "force-dynamic";

export default async function Abstracts() {
  const ev = await getEvent();
  const w = abstractWindow(ev);
  const a = await currentAccount();
  const depts = await db.select({ name: s.departments.name }).from(s.departments).where(eq(s.departments.active, true)).orderBy(asc(s.departments.name));
  const g = {
    ORAL: ["Original research or case reports related to the symposium theme.", `Maximum ${ev.abstractWordLimit} words, excluding title, authors and affiliations; title maximum 35 words.`, "Original research: Background, Methods, Results, Conclusion.", "Case report / series: Background, Case / cases.", "3 to 5 keywords; up to 6 co-authors with affiliations.", "Presenting author must register for the symposium."],
    POSTER: ["Choose Poster, or Either if you prefer oral but accept a poster.", "Same structure and word limits as oral abstracts.", "Each abstract gets an ID and an instant confirmation email.", "Duplicate titles are not accepted.", "Accepted posters appear in the searchable e-abstract book."],
  };
  return (
    <>
      <PageHero eyebrow="Call for abstracts" title={<>Abstract <span className="text-grad">submission</span></>}
        sub="Submit your oral or poster abstract online. Your speciality's department reviews it first, then the Scientific Committee.">
        <div className="mt-8 flex flex-wrap gap-3">
          {ev.abstractOpen && <span className="chip gap-2 py-2"><CalendarClock className="h-4 w-4" />Opens {fmtDate(ev.abstractOpen)}</span>}
          {ev.abstractDeadline && <span className="chip gap-2 border-lnh-red/40 py-2 text-lnh-rose"><CalendarClock className="h-4 w-4" />Deadline {fmtDate(ev.abstractDeadline)}</span>}
          {ev.programmeReleasedAt && <Link href="/abstracts/book" className="chip gap-2 py-2 text-lnh-sky"><BookOpen className="h-4 w-4" />e-Abstract book</Link>}
        </div>
      </PageHero>
      <div className="container-x grid gap-8 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-4">
          {([["ORAL", FileText, "Guidelines"], ["POSTER", Presentation, "Posters and review"]] as const).map(([k, I, t]) => (
            <div key={k} className="card p-6">
              <I className="h-6 w-6 text-lnh-rose" />
              <h2 className="mt-4 font-display text-lg font-semibold text-white">{t}</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-slate-400">{g[k].map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </aside>
        <div className="lg:col-span-8">
          {w !== "OPEN" ? <Alert kind="info">{w === "CLOSED" ? "Abstract submission is now closed. Thank you for your interest." : `Abstract submission opens on ${fmtDate(ev.abstractOpen!)}.`}</Alert>
            : !a ? (
              <div className="hud p-8 text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-lnh-sky" />
                <h2 className="mt-4 font-display text-2xl font-bold text-white">Sign in to submit</h2>
                <p className="mx-auto mt-2 max-w-md text-slate-400">Abstracts are submitted from a verified author account, so we can confirm your email and keep you updated on the decision.</p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link href="/account?mode=signup&next=/abstracts" className="btn-primary">Create account</Link>
                  <Link href="/account?next=/abstracts" className="btn-ghost">Sign in</Link>
                </div>
              </div>
            ) : <AbstractForm wordLimit={ev.abstractWordLimit} departments={depts.map((d) => d.name)}
                account={{ title: a.title, name: `${a.firstName} ${a.lastName}`, email: a.email, phone: a.phone, institution: a.institution, designation: a.designation ?? "", city: a.city ?? "" }} />}
        </div>
      </div>
    </>
  );
}
