import { certificateFor } from "@/lib/certificates";

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const c = await certificateFor(params.token);
  if (!c) return new Response("Certificate not issued yet.", { status: 404 });
  return new Response(Buffer.from(c.pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${c.no}.pdf"` } });
}
