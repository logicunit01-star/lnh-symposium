import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db, schema as s } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { appUrl, fmtTime } from "@/lib/utils";

export default async function QrScreen({ params }: { params: { id: string } }) {
  await requirePerm("sessions");
  const [x] = await db.select().from(s.sessions).where(eq(s.sessions.id, params.id));
  if (!x) notFound();
  const url = `${appUrl()}/feedback/${x.slug}`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 900, color: { dark: "#040B1E", light: "#ffffff" } });
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-lnh-navy to-ink p-8 text-center text-white">
      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-lnh-sky">Scan to give feedback</p>
      <h1 className="h-display mt-4 max-w-4xl text-4xl sm:text-5xl">{x.title}</h1>
      <p className="mt-2 text-white/70">{fmtTime(x.startsAt)} – {fmtTime(x.endsAt)} · {x.hall}</p>
      <img src={qr} alt="QR" className="mt-8 w-[min(60vh,80vw)] rounded-3xl bg-white p-4" />
      <p className="mt-6 font-mono text-sm text-white/60">{url}</p>
    </div>
  );
}
