import { PageHero } from "@/components/ui/PageHero";
import { LookupForm } from "@/components/site/LookupForm";
import { ComingSoon, PreviewNote, staffPreview } from "@/components/site/ComingSoon";
import { getEvent } from "@/lib/event";

export const metadata = { title: "E-certificates" };
export const dynamic = "force-dynamic";

/** 20 Nov 2026: "coming soon" until the e-certificates are available (Admin → Event settings). */
export default async function Certs() {
  const ev = await getEvent();
  const live = ev.certificatesLive, preview = !live && (await staffPreview());
  return (
    <>
      <PageHero eyebrow="E-certificates" title={<>Download your <span className="text-grad-red">certificate</span></>} sub="Certificates are issued to all registered participants after the symposium. Each certificate carries a QR code for online verification." />
      {live || preview ? <>
        {preview && <PreviewNote setting="E-certificates are available" />}
        <div className="container-x max-w-lg"><div className="card p-8"><LookupForm endpoint="/api/certificates/lookup" mode="certificate" cta="Download certificate" /></div></div>
      </> : <ComingSoon what="E-certificates" text="E-certificates will be available here after the symposium." />}
    </>
  );
}
