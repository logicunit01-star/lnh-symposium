import { runReminders } from "@/lib/reminders";
import { runDueJobs } from "@/lib/email";
import { provider, reconcilePayPro } from "@/lib/payments";
import { drainOutbox } from "@/lib/outbox";
import { workerMode } from "@/lib/notify-config";

export const dynamic = "force-dynamic";
// Call from a scheduler (cron / Vercel Cron / Windows Task Scheduler): GET /api/cron/reminders  with header  Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "") || new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || auth !== process.env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });
  // The daily cron also runs any scheduled email dispatch that is due (abstract decisions, invitations)
  // PayPro: pending orders are checked with PayPro first, so nobody gets a "payment pending" reminder after paying
  const payPro = (await provider()) === "paypro" ? await reconcilePayPro().catch((e) => ({ error: String(e) })) : undefined;
  const result = { payPro, ...(await runReminders()), emailDispatches: await runDueJobs("Daily scheduler") };
  // without the lnh-notifier process (Vercel): retry messages that could not be sent
  return Response.json({ ...result, outbox: workerMode() ? "worker" : await drainOutbox({ max: 100, budgetMs: 30_000 }).catch((e) => String(e)) });
}
