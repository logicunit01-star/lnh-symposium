import { apiUser } from "@/lib/auth";
import { availability } from "@/lib/wp-avail";

export const dynamic = "force-dynamic";
const D = /^\d{4}-\d{2}-\d{2}$/, T = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Live room check for the workshop request form: clash, free rooms at that time, free dates for that room. */
export async function GET(req: Request) {
  if (!(await apiUser("workshops"))) return new Response("Forbidden", { status: 403 });
  const u = new URL(req.url).searchParams;
  const date = u.get("date") ?? "", start = u.get("start") ?? "", end = u.get("end") ?? "";
  if (!D.test(date) || !T.test(start) || !T.test(end) || end <= start) return Response.json({ error: "bad request" }, { status: 400 });
  return Response.json(await availability({ date, start, end, venueId: u.get("venueId") || null, excludeId: u.get("exclude") || null, seats: Number(u.get("seats")) || 1 }));
}
