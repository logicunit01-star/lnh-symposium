import { PageHero } from "@/components/ui/PageHero";
import { LookupForm } from "@/components/site/LookupForm";

export const metadata = { title: "E-certificates" };
export default function Certs() {
  return (
    <>
      <PageHero eyebrow="E-certificates" title={<>Download your <span className="text-grad-red">certificate</span></>} sub="Certificates are issued to all registered participants after the symposium. Each certificate carries a QR code for online verification." />
      <div className="container-x max-w-lg"><div className="card p-8"><LookupForm endpoint="/api/certificates/lookup" mode="certificate" cta="Download certificate" /></div></div>
    </>
  );
}
