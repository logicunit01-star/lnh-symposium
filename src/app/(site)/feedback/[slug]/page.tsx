import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { fmtDate, fmtTime, SESSION_TYPE_LABEL } from "@/lib/utils";
import { FeedbackForm } from "./FeedbackForm";

export const metadata = { title: "Session feedback", robots: { index: false } };

export default async function Feedback({ params }: { params: { slug: string } }) {
  const [sess] = await db.select().from(s.sessions).where(eq(s.sessions.slug, params.slug));
  if (!sess) notFound();
  return (
    <section className="container-x max-w-2xl pb-10 pt-32">
      <p className="eyebrow">{SESSION_TYPE_LABEL[sess.type]} feedback</p>
      <h1 className="h-display mt-4 text-3xl text-white sm:text-4xl">{sess.title}</h1>
      <p className="mt-2 text-sm text-slate-400">{fmtDate(sess.startsAt, { weekday: "long", day: "numeric", month: "long" })} · {fmtTime(sess.startsAt)} · {sess.hall}</p>
      <div className="card mt-8 p-6 sm:p-8">{sess.feedbackOpen ? <FeedbackForm slug={sess.slug} /> : <p className="text-slate-400">Feedback for this session is closed.</p>}</div>
    </section>
  );
}
