import { eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Download the uploaded agenda template for a session format (staff and department logins only). */
export async function GET(_: Request, { params }: { params: { format: string } }) {
  if (!(await currentUser())) return new Response("Sign in required", { status: 401 });
  const [f] = await db.select().from(s.agendaTemplateFiles).where(eq(s.agendaTemplateFiles.format, params.format));
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(f.data, "base64"), { headers: { "content-type": f.mime, "content-disposition": `attachment; filename="${f.fileName.replace(/["\r\n]/g, "")}"`, "cache-control": "private, no-store" } });
}
