import { drainOutbox } from "@/lib/outbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
// Sends queued / retried emails, WhatsApp and SMS. Not needed where the lnh-notifier process runs (LNH server).
// Elsewhere call it every few minutes: GET /api/cron/notify with header Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "") || new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || auth !== process.env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });
  return Response.json(await drainOutbox({ max: 100, budgetMs: 45_000 }));
}
