import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ShieldCheck } from "lucide-react";
import { db, schema as s } from "@/lib/db";
import { provider } from "@/lib/payments";
import { pkr } from "@/lib/utils";

export const metadata = { title: "Test payment", robots: { index: false } };

export default async function MockPay({ searchParams }: { searchParams: { txn?: string } }) {
  if (provider() !== "mock" || !searchParams.txn) notFound();
  const pay = await db.query.payments.findFirst({ where: eq(s.payments.txnRef, searchParams.txn), with: { registration: true } });
  if (!pay) notFound();
  return (
    <section className="container-x flex min-h-[80vh] max-w-lg items-center pt-32">
      <div className="card w-full p-8">
        <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-300">TEST MODE — simulated payment gateway. No real money is charged.</p>
        <ShieldCheck className="mt-6 h-10 w-10 text-lnh-sky" />
        <h1 className="h-display mt-4 text-3xl text-white">Secure checkout</h1>
        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-400">Registration</dt><dd className="text-white">{pay.registration.regNo}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-400">Transaction</dt><dd className="font-mono text-white">{pay.txnRef}</dd></div>
          <div className="flex justify-between border-t border-white/10 pt-3"><dt className="text-slate-400">Amount</dt><dd className="font-display text-2xl font-bold text-white">{pkr(pay.amount)}</dd></div>
        </dl>
        <form action="/api/payments/mock" method="POST" className="mt-8 flex gap-3">
          <input type="hidden" name="txn" value={pay.txnRef} />
          <button name="result" value="approve" className="btn-primary flex-1">Approve payment</button>
          <button name="result" value="decline" className="btn-ghost">Decline</button>
        </form>
      </div>
    </section>
  );
}
