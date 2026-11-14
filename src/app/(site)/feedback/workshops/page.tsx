import { WorkshopFeedbackForm } from "@/components/site/WorkshopFeedbackForm";

export const metadata = { title: "Workshop feedback", robots: { index: false } };

/** N7 (13 Nov 2026): workshop feedback; the e-certificate is issued once feedback is in and the department has confirmed attendance. */
export default function WorkshopFeedback({ searchParams }: { searchParams: { t?: string } }) {
  return (
    <section className="container-x max-w-2xl pb-10 pt-32">
      <p className="eyebrow">Workshop feedback</p>
      <h1 className="h-display mt-4 text-3xl text-white sm:text-4xl">Tell us about your workshop</h1>
      <p className="mt-2 text-sm text-slate-400">Your workshop certificate is emailed once you submit this form and your department confirms your attendance.</p>
      <div className="card mt-8 p-6 sm:p-8"><WorkshopFeedbackForm token={searchParams.t} /></div>
    </section>
  );
}
