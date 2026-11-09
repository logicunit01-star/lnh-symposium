import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";

/** Guest photograph uploaded on the admin Programme pages (stored in the database so it works on any host). */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const [g] = await db.select({ mime: s.programmeGuests.photoMime, data: s.programmeGuests.photoData }).from(s.programmeGuests).where(eq(s.programmeGuests.id, params.id));
  if (!g?.mime || !g.data) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(g.data, "base64"), { headers: { "content-type": g.mime, "cache-control": "public, max-age=300" } });
}
