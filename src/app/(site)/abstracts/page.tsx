import { CalendarClock, FileText, Presentation } from "lucide-react";
import { getEvent, abstractWindow } from "@/lib/event";
import { PageHero } from "@/components/ui/PageHero";
import { Alert } from "@/components/ui/Field";
import { fmtDate } from "@/lib/utils";
import { AbstractForm } from "./AbstractForm";

export const metadata = { title: "Abstract Submission" };

export default async function Abstracts({ searchParams }: { searchParams: { type?: string } }) {
  const ev = await getEvent();
  const w = abstractWindow(ev);
  const g = {
    ORAL: ["Original research related to cost, quality or technology in healthcare.", "Structured abstract: Introduction, Methods, Results, Conclusions.", `Maximum ${ev.abstractWordLimit} words (excluding title, authors and affiliations).`, "No tables, figures or references in the abstract.", "Accepted papers: 8 minutes presentation + 2 minutes Q&A.", "Presenting author must register for the symposium."],
    POSTER: ["Research, audits, QI projects and case series are welcome.", "Same structured format and word limit as oral abstracts.", "Poster size: 36 × 48 inches (portrait). Printing is the presenter’s responsibility.", "Presenters must be available at their poster during the judging slot.", "Presenting author must register for the symposium."],
  };
  return (
    <>
      <PageHero eyebrow="Call for abstracts" title={<>Abstract <span className="text-grad">submission</span></>}
        sub="Submit your scientific paper or poster online. You will receive a reference number by email and SMS immediately.">
        <div className="mt-8 flex flex-wrap gap-3">
          {ev.abstractOpen && <span className="chip gap-2 py-2"><CalendarClock className="h-4 w-4" />Opens {fmtDate(ev.abstractOpen)}</span>}
          {ev.abstractDeadline && <span className="chip gap-2 border-lnh-red/40 py-2 text-lnh-rose"><CalendarClock className="h-4 w-4" />Deadline {fmtDate(ev.abstractDeadline)}</span>}
        </div>
      </PageHero>
      <div className="container-x grid gap-8 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-4">
          {([["ORAL", FileText, "Scientific paper — guidelines"], ["POSTER", Presentation, "Poster — guidelines"]] as const).map(([k, I, t]) => (
            <div key={k} className="card p-6">
              <I className="h-6 w-6 text-lnh-rose" />
              <h2 className="mt-4 font-display text-lg font-semibold text-white">{t}</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm text-slate-400">{g[k].map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          ))}
        </aside>
        <div className="lg:col-span-8">
          {w === "OPEN" ? <AbstractForm initialType={searchParams.type === "POSTER" ? "POSTER" : "ORAL"} wordLimit={ev.abstractWordLimit} />
            : <Alert kind="info">{w === "CLOSED" ? "Abstract submission is now closed. Thank you for your interest." : `Abstract submission opens on ${fmtDate(ev.abstractOpen!)}.`}</Alert>}
        </div>
      </div>
    </>
  );
}
