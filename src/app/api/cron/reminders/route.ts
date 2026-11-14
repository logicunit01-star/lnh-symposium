import { runReminders } from "@/lib/reminders";
import { runDueJobs } from "@/lib/email";
import { provider, reconcilePayPro } from "@/lib/payments";

export const dynamic = "force-dynamic";
// Call from a scheduler (cron / Vercel Cron / Windows Task Scheduler): GET /api/cron/reminders  with header  Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "") || new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || auth !== process.env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });
  // The daily cron also runs any scheduled email dispatch that is due (abstract decisions, invitations)
  // PayPro: pending orders are checked with PayPro first, so nobody gets a "payment pending" reminder after paying
  const payPro = provider() === "paypro" ? await reconcilePayPro().catch((e) => ({ error: String(e) })) : undefined;
  return Response.json({ payPro, ...(await runReminders()), emailDispatches: await runDueJobs("Daily scheduler") });
}
