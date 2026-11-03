import { runReminders } from "@/lib/reminders";
import { runDueJobs } from "@/lib/email";

export const dynamic = "force-dynamic";
// Call from a scheduler (cron / Vercel Cron / Windows Task Scheduler): GET /api/cron/reminders  with header  Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "") || new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || auth !== process.env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });
  // The daily cron also runs any scheduled email dispatch that is due (abstract decisions, invitations)
  return Response.json({ ...(await runReminders()), emailDispatches: await runDueJobs("Daily scheduler") });
}
