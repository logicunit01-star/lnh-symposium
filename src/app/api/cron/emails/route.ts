import { cronOk } from "@/lib/cron-auth";
import { runDueJobs } from "@/lib/email";
import { provider, reconcilePayPro } from "@/lib/payments";
import { drainOutbox } from "@/lib/outbox";
import { workerMode } from "@/lib/notify-config";

export const dynamic = "force-dynamic";
// Scheduled email dispatches. Call every 15–60 minutes from a scheduler: GET /api/cron/emails with header Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  if (!cronOk(req)) return new Response("Unauthorized", { status: 401 });
  // PayPro: check pending orders every run (15 min on the LNH server), so payments are confirmed even without a callback
  const payPro = (await provider()) === "paypro" ? await reconcilePayPro().catch((e) => ({ error: String(e) })) : undefined;
  const ran = await runDueJobs("Scheduler");
  return Response.json({ payPro, ran, outbox: workerMode() ? "worker" : await drainOutbox({ max: 100, budgetMs: 30_000 }).catch((e) => String(e)) });
}
