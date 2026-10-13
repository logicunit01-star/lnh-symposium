import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { currentUser } from "@/lib/auth";

// Target of the QR code on confirmations. Staff are sent to the check-in screen; others see a minimal status.
export default async function QrLanding({ params }: { params: { regNo: string } }) {
  const [r] = await db.select({ id: s.registrations.id, regNo: s.registrations.regNo, status: s.registrations.paymentStatus }).from(s.registrations).where(eq(s.registrations.regNo, params.regNo.toUpperCase()));
  if (!r) notFound();
  if (await currentUser()) redirect(`/admin/checkin?q=${r.regNo}`);
  const ok = r.status === "PAID" || r.status === "WAIVED";
  return (
    <section className="container-x flex min-h-[70vh] max-w-md items-center pt-32">
      <div className="card w-full p-10 text-center">
        <p className="eyebrow">Registration</p>
        <p className="h-display mt-3 text-4xl text-white">{r.regNo}</p>
        <p className={`mt-4 font-semibold ${ok ? "text-emerald-400" : "text-amber-400"}`}>{ok ? "Confirmed" : "Payment pending"}</p>
      </div>
    </section>
  );
}
