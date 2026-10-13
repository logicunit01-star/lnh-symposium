import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { getEvent } from "@/lib/event";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const ev = await getEvent();
  return (
    <>
      <Nav year={new Date(ev.startDate).getFullYear()} />
      <main className="min-h-screen">{children}</main>
      <Footer ev={ev} />
    </>
  );
}
