import { cronOk } from "@/lib/cron-auth";
import { drainOutbox } from "@/lib/outbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
// Sends queued / retried emails, WhatsApp and SMS. Not needed where the lnh-notifier process runs (LNH server).
// Elsewhere call it every few minutes: GET /api/cron/notify with header Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  if (!cronOk(req)) return new Response("Unauthorized", { status: 401 });
  return Response.json(await drainOutbox({ max: 100, budgetMs: 45_000 }));
}
