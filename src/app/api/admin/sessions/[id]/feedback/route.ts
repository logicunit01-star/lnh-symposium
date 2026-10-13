import { apiUser } from "@/lib/auth";
import { feedbackStats } from "@/lib/feedbackStats";

export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!(await apiUser("feedback")) && !(await apiUser("sessions"))) return new Response("Forbidden", { status: 403 });
  return Response.json(await feedbackStats(params.id));
}
