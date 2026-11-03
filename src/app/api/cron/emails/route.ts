import { runDueJobs } from "@/lib/email";

export const dynamic = "force-dynamic";
// Scheduled email dispatches. Call every 15–60 minutes from a scheduler: GET /api/cron/emails with header Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "") || new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || auth !== process.env.CRON_SECRET) return new Response("Unauthorized", { status: 401 });
  return Response.json({ ran: await runDueJobs("Scheduler") });
}
