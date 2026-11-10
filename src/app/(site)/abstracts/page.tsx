import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { BookOpen, CalendarClock, FileText, ShieldCheck } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { getEvent, abstractWindow } from "@/lib/event";
import { currentAccount } from "@/lib/account";
import { PageHero } from "@/components/ui/PageHero";
import { Alert } from "@/components/ui/Field";
import { cn, fmtDate, fmtDateTime } from "@/lib/utils";
import { authorStatus } from "@/lib/abstracts";
import { SECTION_LIMITS } from "@/lib/scientific";
import { AbstractForm } from "./AbstractForm";

export const metadata = { title: "Abstract Submission" };
export const dynamic = "force-dynamic";

export default async function Abstracts() {
  const ev = await getEvent();
  const w = abstractWindow(ev);
  const a = await currentAccount();
  const depts = await db.select({ name: s.departments.name }).from(s.departments).where(eq(s.departments.active, true)).orderBy(asc(s.departments.name));
  const mine = a ? await db.select().from(s.abstracts).where(eq(s.abstracts.accountId, a.id)).orderBy(desc(s.abstracts.createdAt)) : [];
  const O = SECTION_LIMITS.ORIGINAL, C = SECTION_LIMITS.CASE;
  const guidelines = [
    "Original research or case reports / case series.",
    `Maximum 300 words in total, excluding title, authors and affiliations; title maximum 35 words.`,
    `Original research: Introduction (including objectives/purpose) ${O.background}, Methods ${O.methods}, Results ${O.results}, Conclusion ${O.conclusion} words.`,
    `Case report / series: Introduction (including objectives/purpose) ${C.background}, Case report / series ${C.cases} words.`,
    "3 to 5 keywords; co-authors are optional (up to 6, with affiliations).",
    "Each abstract gets an ID and an instant confirmation email. Duplicate titles are not accepted.",
    "The presenting author must register for the symposium.",
  ];
  return (
    <>
      <PageHero eyebrow="Call for abstracts" title={<>Abstract <span className="text-grad">submission</span></>}
        sub="Submit your abstract online. It will be reviewed by the relevant speciality/department; you can follow its status here.">
        <div className="mt-8 flex flex-wrap gap-3">
          {ev.abstractOpen && <span className="chip gap-2 py-2"><CalendarClock className="h-4 w-4" />Opens {fmtDate(ev.abstractOpen)}</span>}
          {ev.abstractDeadline && <span className="chip gap-2 border-lnh-red/40 py-2 text-lnh-rose"><CalendarClock className="h-4 w-4" />Deadline {fmtDate(ev.abstractDeadline)}</span>}
          {ev.programmeReleasedAt && <Link href="/abstracts/book" className="chip gap-2 py-2 text-lnh-sky"><BookOpen className="h-4 w-4" />e-Abstract book</Link>}
        </div>
      </PageHero>
      <div className="container-x grid gap-8 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-4">
          <div className="card p-6">
            <FileText className="h-6 w-6 text-lnh-rose" />
            <h2 className="mt-4 font-display text-lg font-semibold text-white">Guidelines</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-slate-400">{guidelines.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        </aside>
        <div className="space-y-6 lg:col-span-8">
          {mine.length > 0 && (
            <div id="my-abstracts" className="hud scroll-mt-28 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="mono text-xs uppercase tracking-[0.2em] text-slate-400">My abstracts · status</p>
                {w === "OPEN" && <a href="#submit-abstract" className="text-sm font-semibold text-lnh-sky underline">Submit another abstract</a>}</div>
              <ul className="mt-3 divide-y divide-white/10">{mine.map((x) => {
                const st = authorStatus(x);
                return (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span className="min-w-0"><span className="mono text-xs text-lnh-sky">{x.refNo}</span><span className="block text-white">{x.abstractTitle}</span><span className="text-xs text-slate-500">Submitted {fmtDateTime(x.createdAt)} · {x.specialty}</span></span>
                    <span className="text-right"><span className={cn("rounded-full px-3 py-1 text-xs font-bold", st.tone === "ok" ? "bg-emerald-400/15 text-emerald-300" : st.tone === "no" ? "bg-rose-400/15 text-rose-300" : "bg-amber-400/15 text-amber-300")}>{st.label}</span><span className="mt-1 block text-[11px] text-slate-500">{st.detail}</span></span>
                  </li>
                );
              })}</ul>
            </div>
          )}
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
            ) : <div id="submit-abstract" className="scroll-mt-28"><AbstractForm wordLimit={ev.abstractWordLimit} departments={depts.map((d) => d.name)}
                account={{ title: a.title, name: `${a.firstName} ${a.lastName}`, email: a.email, phone: a.phone, institution: a.institution ?? "", designation: a.designation ?? "", city: a.city ?? "" }} /></div>}
        </div>
      </div>
    </>
  );
}
