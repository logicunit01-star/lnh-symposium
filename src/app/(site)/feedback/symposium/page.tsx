import { FeedbackForm } from "../[slug]/FeedbackForm";
import { eventDaysLabel, getEvent } from "@/lib/event";

export const metadata = { title: "Symposium feedback", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Issues email 16 Nov 2026 (item 5): feedback on the symposium as a whole, for participants who attended it. */
export default async function SymposiumFeedback({ searchParams }: { searchParams: { t?: string } }) {
  const ev = await getEvent();
  return (
    <section className="container-x max-w-2xl pb-10 pt-32">
      <p className="eyebrow">Symposium feedback</p>
      <h1 className="h-display mt-4 text-3xl text-white sm:text-4xl">{ev.name}</h1>
      <p className="mt-2 text-sm text-slate-400">{eventDaysLabel(ev, "long")} · Liaquat National Hospital, Karachi</p>
      <p className="mt-4 text-slate-300">Tell us about the symposium as a whole. It takes about a minute. Feedback on a single session or workshop is on that session&apos;s own feedback page.</p>
      <div className="card mt-8 p-6 sm:p-8"><FeedbackForm slug="symposium" symposium={{ token: searchParams.t }} /></div>
    </section>
  );
}
