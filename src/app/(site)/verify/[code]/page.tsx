import { eq } from "drizzle-orm";
import { BadgeCheck, XCircle } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { getEvent } from "@/lib/event";
import { fmtDate } from "@/lib/utils";

export const metadata = { title: "Verify certificate", robots: { index: false } };
export default async function Verify({ params }: { params: { code: string } }) {
  const [r] = await db.select().from(s.registrations).where(eq(s.registrations.certificateNo, params.code.toUpperCase()));
  const ev = await getEvent();
  return (
    <section className="container-x flex min-h-[80vh] max-w-xl items-center pt-32">
      <div className="card w-full p-10 text-center">
        {r ? <>
          <BadgeCheck className="mx-auto h-14 w-14 text-emerald-400" />
          <h1 className="h-display mt-6 text-3xl text-white">Valid certificate</h1>
          <p className="mt-4 text-slate-300">Certificate <b className="text-white">{r.certificateNo}</b> was issued to</p>
          <p className="mt-2 font-display text-2xl font-bold text-white">{r.title} {r.firstName} {r.lastName}</p>
          <p className="mt-1 text-sm text-slate-400">{r.institution}</p>
          <p className="mt-6 text-sm text-slate-400">for participation in the {ev.name}{r.certificateAt ? ` · issued ${fmtDate(r.certificateAt)}` : ""}.</p>
        </> : <>
          <XCircle className="mx-auto h-14 w-14 text-lnh-rose" />
          <h1 className="h-display mt-6 text-3xl text-white">Not found</h1>
          <p className="mt-4 text-slate-400">No certificate exists with number “{params.code}”.</p>
        </>}
      </div>
    </section>
  );
}
