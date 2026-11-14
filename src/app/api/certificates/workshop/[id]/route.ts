import { workshopCertificateFor } from "@/lib/certificates";

export const dynamic = "force-dynamic";
/** Workshop e-certificate (N6): /api/certificates/workshop/<ticket item id>?t=<registration access token> */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const t = new URL(req.url).searchParams.get("t") || "";
  const c = t ? await workshopCertificateFor(params.id, t) : null;
  if (!c) return new Response("Certificate not issued yet. It is issued once the department confirms your attendance and you submit the workshop feedback form.", { status: 404 });
  return new Response(Buffer.from(c.pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${c.no}.pdf"`, "cache-control": "no-store" } });
}
