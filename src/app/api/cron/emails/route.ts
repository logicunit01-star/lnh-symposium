import { cronOk } from "@/lib/cron-auth";
import { runDueJobs } from "@/lib/email";
import { provider, reconcilePayPro } from "@/lib/payments";
import { drainOutbox } from "@/lib/outbox";
import { workerMode } from "@/lib/notify-config";
import { expireUnpaid } from "@/lib/seat-hold";

export const dynamic = "force-dynamic";
// Scheduled email dispatches. Call every 15–60 minutes from a scheduler: GET /api/cron/emails with header Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  if (!cronOk(req)) return new Response("Unauthorized", { status: 401 });
  // PayPro: check pending orders every run (15 min on the LNH server), so payments are confirmed even without a callback
  const payPro = (await provider()) === "paypro" ? await reconcilePayPro().catch((e) => ({ error: String(e) })) : undefined;
  // P1: unpaid registrations whose workshop seat hold has ended are cancelled and the seats released
  const seatHold = await expireUnpaid().catch((e) => ({ error: String(e) }));
  const ran = await runDueJobs("Scheduler");
  return Response.json({ payPro, seatHold, ran, outbox: workerMode() ? "worker" : await drainOutbox({ max: 100, budgetMs: 30_000 }).catch((e) => String(e)) });
}
