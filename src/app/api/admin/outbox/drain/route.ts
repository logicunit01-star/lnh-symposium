import { and, eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { apiUser } from "@/lib/auth";
import { drainOutbox } from "@/lib/outbox";
import { workerMode } from "@/lib/notify-config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
/** Bulk message progress (Reminders & certificates): sends the next part of a batch (unless lnh-notifier does it) and reports counts. */
export async function POST(req: Request) {
  if (!(await apiUser("notifications"))) return Response.json({ error: "Not allowed" }, { status: 403 });
  const { ref } = await req.json().catch(() => ({}));
  if (typeof ref !== "string" || !/^BROADCAST-[A-Z0-9]+$/.test(ref)) return Response.json({ error: "Unknown batch" }, { status: 400 });
  if (!workerMode()) await drainOutbox({ ref, max: 40, budgetMs: 20_000 });
  // messages waiting for a later retry are reported separately, so the page stops polling once the first pass is done
  const st = sql<string>`case when ${s.notificationLog.status} = 'QUEUED' and ${s.notificationLog.nextAttemptAt} > now() then 'RETRY' else ${s.notificationLog.status} end`;
  const rows = await db.select({ st, n: sql<number>`count(*)::int` }).from(s.notificationLog).where(and(eq(s.notificationLog.ref, ref))).groupBy(st);
  const c = (k: string[]) => rows.filter((r) => k.includes(r.st)).reduce((a, r) => a + r.n, 0);
  return Response.json({ waiting: c(["QUEUED", "SENDING"]), sent: c(["SENT"]), failed: c(["FAILED"]) + c(["RETRY"]), retry: c(["RETRY"]), logged: c(["LOGGED"]), worker: workerMode() });
}
