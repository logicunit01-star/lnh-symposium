import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { LookupForm } from "@/components/site/LookupForm";
import { LookupFlow } from "./LookupFlow";

export const metadata = { title: "Find my tickets" };

/** One place to find tickets without signing in (release 2): by a code sent to the mobile number, or by registration number and email. */
export default function FindMyTickets() {
  return (
    <>
      <PageHero eyebrow="Find my tickets" title={<>Find my <span className="text-grad">tickets</span></>}
        sub="For registrations made at the desk, as a guest or volunteer, or without an account. Have an account? Sign in to see everything in My tickets." >
        <div className="mt-6"><Link href="/account?next=/account/bookings" className="btn-ghost btn-sm">Sign in instead</Link></div>
      </PageHero>
      <div className="container-x grid max-w-5xl gap-8 lg:grid-cols-2">
        <section aria-labelledby="h-code">
          <h2 id="h-code" className="font-display text-xl font-bold text-white">Get a code by SMS</h2>
          <p className="mb-4 mt-1 text-sm text-slate-300">Enter the mobile number you registered with. We text a one-time code, then list every registration made with it.</p>
          <LookupFlow />
        </section>
        <section aria-labelledby="h-reg">
          <h2 id="h-reg" className="font-display text-xl font-bold text-white">Use your registration number</h2>
          <p className="mb-4 mt-1 text-sm text-slate-300">Printed on your confirmation PDF and email, for example SYM-2027-00012.</p>
          <div className="card p-6"><LookupForm endpoint="/api/register/lookup" mode="status" cta="Find my registration" /></div>
        </section>
      </div>
    </>
  );
}
