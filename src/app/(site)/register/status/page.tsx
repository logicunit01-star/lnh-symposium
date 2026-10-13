import { PageHero } from "@/components/ui/PageHero";
import { LookupForm } from "@/components/site/LookupForm";

export const metadata = { title: "Check registration" };
export default function Status() {
  return (
    <>
      <PageHero eyebrow="Your registration" title={<>Check <span className="text-grad">status</span></>} sub="View your registration, pay pending fees or download your confirmation PDF." />
      <div className="container-x max-w-lg"><div className="card p-8"><LookupForm endpoint="/api/register/lookup" mode="status" cta="Find my registration" /></div></div>
    </>
  );
}
