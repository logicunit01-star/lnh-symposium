import { loadRegistration } from "@/lib/registration";
import { getEvent } from "@/lib/event";
import { registrationPdf } from "@/lib/pdf";

export async function GET(_: Request, { params }: { params: { token: string } }) {
  const r = await loadRegistration({ accessToken: params.token });
  if (!r) return new Response("Not found", { status: 404 });
  const pdf = await registrationPdf(r, await getEvent());
  return new Response(Buffer.from(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${r.regNo}.pdf"` } });
}
